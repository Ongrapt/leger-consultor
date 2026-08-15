import "server-only";
import { get } from "@vercel/blob";
import { PDFDocument } from "pdf-lib";
import type { UIMessage, FileUIPart } from "ai";
import { ARCHIVOS_PREFIX } from "@/lib/blob";

async function archivoComoBuffer(pathname: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  const resultado = await get(pathname, { access: "private" });
  if (!resultado || resultado.statusCode !== 200) return null;
  const buffer = Buffer.from(await new Response(resultado.stream).arrayBuffer());
  return { buffer, contentType: resultado.blob.contentType };
}

/**
 * Cuenta las páginas de un PDF ya subido (referenciado por su URL proxy).
 * Devuelve null si el archivo no es un PDF resoluble (p.ej. ya no existe).
 */
export async function contarPaginasPdf(url: string): Promise<number | null> {
  if (!url.startsWith(ARCHIVOS_PREFIX)) return null;
  const pathname = url.slice(ARCHIVOS_PREFIX.length);
  const archivo = await archivoComoBuffer(pathname);
  if (!archivo || archivo.contentType !== "application/pdf") return null;
  const documento = await PDFDocument.load(archivo.buffer, { ignoreEncryption: true });
  return documento.getPageCount();
}

/**
 * Sustituye las URLs proxy (`/api/archivos/...`, no accesibles para el modelo) por
 * data: URLs con el contenido real del archivo, solo para la llamada al modelo —
 * lo que se persiste en la base de datos conserva la URL proxy.
 */
export async function resolverArchivosParaModelo(
  messages: UIMessage[],
): Promise<UIMessage[]> {
  return Promise.all(
    messages.map(async (message) => {
      const parts = await Promise.all(
        message.parts.map(async (part) => {
          if (part.type !== "file" || !part.url.startsWith(ARCHIVOS_PREFIX)) {
            return part;
          }
          const pathname = part.url.slice(ARCHIVOS_PREFIX.length);
          const archivo = await archivoComoBuffer(pathname);
          if (!archivo) return part;
          const dataUrl = `data:${archivo.contentType};base64,${archivo.buffer.toString("base64")}`;
          return { ...part, url: dataUrl } satisfies FileUIPart;
        }),
      );
      return { ...message, parts };
    }),
  );
}
