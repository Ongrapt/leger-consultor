import "server-only";
import { get } from "@vercel/blob";
import { PDFDocument } from "pdf-lib";
import { uploadFile, type FileUIPart } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { eq } from "drizzle-orm";
import { ARCHIVOS_PREFIX } from "@/lib/blob";
import { getDb } from "@/lib/db";
import { documentFuentes } from "@/lib/db/schema";

async function archivoComoBuffer(pathname: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  const resultado = await get(pathname, { access: "private" });
  if (!resultado || resultado.statusCode !== 200) return null;
  const buffer = Buffer.from(await new Response(resultado.stream).arrayBuffer());
  return { buffer, contentType: resultado.blob.contentType };
}

/**
 * Cuenta las "páginas" de un archivo ya subido (referenciado por su URL
 * proxy), para el límite de páginas por análisis: páginas reales para un
 * PDF, 1 para una imagen (cuenta como una sola página). Devuelve null si el
 * archivo no es de un tipo contable o ya no existe.
 */
export async function contarPaginas(url: string): Promise<number | null> {
  if (!url.startsWith(ARCHIVOS_PREFIX)) return null;
  const pathname = url.slice(ARCHIVOS_PREFIX.length);
  const archivo = await archivoComoBuffer(pathname);
  if (!archivo) return null;
  if (archivo.contentType === "application/pdf") {
    const documento = await PDFDocument.load(archivo.buffer, { ignoreEncryption: true });
    return documento.getPageCount();
  }
  if (archivo.contentType.startsWith("image/")) return 1;
  return null;
}

/**
 * Convierte las fuentes de un análisis (tabla document_fuentes) en partes de
 * archivo listas para inyectarse en la llamada al modelo.
 *
 * Cada archivo se sube UNA sola vez a la Files API de Anthropic (se persiste
 * su file_id en document_fuentes.anthropic_file_id); en cada llamada al
 * modelo se referencia por ese id en vez de reenviar el archivo completo en
 * base64. Con documentos escaneados grandes, reenviar el base64 en cada
 * mensaje del chat puede superar el límite de tamaño de request de la API
 * (error 413 "request_too_large"); referenciarlo por id evita eso.
 */
export async function resolverFuentesParaModelo(
  fuentes: { id: string; url: string; contentType: string; nombreArchivo: string; anthropicFileId: string | null }[],
): Promise<FileUIPart[]> {
  const partes = await Promise.all(
    fuentes.map(async (fuente): Promise<FileUIPart | null> => {
      if (!fuente.url.startsWith(ARCHIVOS_PREFIX)) return null;

      let anthropicFileId = fuente.anthropicFileId;
      if (!anthropicFileId) {
        const pathname = fuente.url.slice(ARCHIVOS_PREFIX.length);
        const archivo = await archivoComoBuffer(pathname);
        if (!archivo) return null;

        const { providerReference } = await uploadFile({
          api: anthropic.files(),
          data: archivo.buffer,
          mediaType: archivo.contentType,
          filename: fuente.nombreArchivo,
        });
        anthropicFileId = providerReference.anthropic;

        await getDb()
          .update(documentFuentes)
          .set({ anthropicFileId })
          .where(eq(documentFuentes.id, fuente.id));
      }

      return {
        type: "file",
        url: "",
        mediaType: fuente.contentType,
        filename: fuente.nombreArchivo,
        providerReference: { anthropic: anthropicFileId },
        // El archivo se referencia por file_id en cada turno; se marca para
        // caché de Anthropic (Prompt Caching) para no volver a pagar/procesar
        // esos tokens completos en cada mensaje.
        providerMetadata: {
          anthropic: { cacheControl: { type: "ephemeral", ttl: "1h" } },
        },
      };
    }),
  );
  return partes.filter((p): p is FileUIPart => p !== null);
}
