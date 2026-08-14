import "server-only";
import { get } from "@vercel/blob";
import type { UIMessage, FileUIPart } from "ai";
import { ARCHIVOS_PREFIX } from "@/lib/blob";

async function archivoComoDataUrl(pathname: string): Promise<string | null> {
  const resultado = await get(pathname, { access: "private" });
  if (!resultado || resultado.statusCode !== 200) return null;
  const buffer = Buffer.from(await new Response(resultado.stream).arrayBuffer());
  return `data:${resultado.blob.contentType};base64,${buffer.toString("base64")}`;
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
          const dataUrl = await archivoComoDataUrl(pathname);
          if (!dataUrl) return part;
          return { ...part, url: dataUrl } satisfies FileUIPart;
        }),
      );
      return { ...message, parts };
    }),
  );
}
