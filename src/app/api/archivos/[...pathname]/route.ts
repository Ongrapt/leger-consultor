import { auth } from "@clerk/nextjs/server";
import { get } from "@vercel/blob";
import { eq, and } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { documentIdDePathname } from "@/lib/blob";

export async function GET(
  _req: Request,
  { params }: RouteContext<"/api/archivos/[...pathname]">,
) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("No autorizado", { status: 401 });
  }

  const { pathname: segments } = await params;
  const pathname = segments.join("/");

  const documentId = documentIdDePathname(pathname);
  if (!documentId) {
    return new Response("No encontrado", { status: 404 });
  }

  const [documento] = await getDb()
    .select({ id: documents.id })
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
    .limit(1);
  if (!documento) {
    return new Response("No encontrado", { status: 404 });
  }

  const resultado = await get(pathname, { access: "private" });
  if (!resultado || resultado.statusCode !== 200) {
    return new Response("No encontrado", { status: 404 });
  }

  return new Response(resultado.stream, {
    headers: {
      "content-type": resultado.blob.contentType,
      "content-disposition": resultado.blob.contentDisposition,
      "cache-control": "private, max-age=3600",
    },
  });
}
