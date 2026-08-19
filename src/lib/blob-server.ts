import "server-only";
import { get } from "@vercel/blob";
import { PDFDocument } from "pdf-lib";
import type { FileUIPart } from "ai";
import { ARCHIVOS_PREFIX } from "@/lib/blob";

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
 * archivo listas para inyectarse en la llamada al modelo, con el contenido
 * real como data: URL.
 */
export async function resolverFuentesParaModelo(
  fuentes: { url: string; contentType: string; nombreArchivo: string }[],
): Promise<FileUIPart[]> {
  const partes = await Promise.all(
    fuentes.map(async (fuente): Promise<FileUIPart | null> => {
      if (!fuente.url.startsWith(ARCHIVOS_PREFIX)) return null;
      const pathname = fuente.url.slice(ARCHIVOS_PREFIX.length);
      const archivo = await archivoComoBuffer(pathname);
      if (!archivo) return null;
      const dataUrl = `data:${archivo.contentType};base64,${archivo.buffer.toString("base64")}`;
      return {
        type: "file",
        url: dataUrl,
        mediaType: fuente.contentType,
        filename: fuente.nombreArchivo,
        // El mismo archivo se reenvía en cada turno; se marca para caché de
        // Anthropic (Prompt Caching) para no volver a pagar/procesar esos
        // tokens completos en cada mensaje.
        providerMetadata: {
          anthropic: { cacheControl: { type: "ephemeral", ttl: "1h" } },
        },
      };
    }),
  );
  return partes.filter((p): p is FileUIPart => p !== null);
}
