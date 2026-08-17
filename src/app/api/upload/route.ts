import { auth } from "@clerk/nextjs/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { eq, and } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { documentIdDePathname } from "@/lib/blob";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = (await req.json()) as HandleUploadBody;

  try {
    const resultado = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        const documentId = documentIdDePathname(pathname);
        if (!documentId) {
          throw new Error("Ruta de archivo inválida");
        }
        const [documento] = await getDb()
          .select({ id: documents.id })
          .from(documents)
          .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
          .limit(1);
        if (!documento) {
          throw new Error("Documento no encontrado");
        }
        return {
          allowedContentTypes: ["application/pdf", "image/png", "image/jpeg", "image/webp", "image/gif"],
          maximumSizeInBytes: 25 * 1024 * 1024,
          addRandomSuffix: false,
        };
      },
    });
    return Response.json(resultado);
  } catch (error) {
    console.error("[api/upload] Error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Error al subir el archivo" },
      { status: 400 },
    );
  }
}
