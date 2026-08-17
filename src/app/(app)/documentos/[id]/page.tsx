import { auth } from "@clerk/nextjs/server";
import { and, asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import type { UIMessage } from "ai";
import DocumentChat from "@/components/DocumentChat";
import { getDb } from "@/lib/db";
import { documents, messages as messagesTable } from "@/lib/db/schema";
import { obtenerUso } from "@/lib/usage";

export default async function DocumentoPage(
  props: PageProps<"/documentos/[id]">,
) {
  const { id } = await props.params;
  const { userId } = await auth();
  if (!userId) notFound();

  const db = getDb();
  const [documento] = await db
    .select({ id: documents.id, archivoAnalizado: documents.archivoAnalizado })
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, userId)))
    .limit(1);
  if (!documento) notFound();

  const filas = await db
    .select({
      id: messagesTable.id,
      role: messagesTable.role,
      parts: messagesTable.parts,
    })
    .from(messagesTable)
    .where(eq(messagesTable.documentId, id))
    .orderBy(asc(messagesTable.createdAt));

  const initialMessages: UIMessage[] = filas.map((fila) => ({
    id: fila.id,
    role: fila.role as UIMessage["role"],
    parts: fila.parts,
  }));

  const uso = await obtenerUso(userId);

  return (
    <DocumentChat
      documentId={id}
      initialMessages={initialMessages}
      uso={uso}
      documentoYaAnalizado={documento.archivoAnalizado}
    />
  );
}
