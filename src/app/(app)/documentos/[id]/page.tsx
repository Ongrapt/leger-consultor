import { auth } from "@clerk/nextjs/server";
import { and, asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import type { UIMessage } from "ai";
import DocumentChat from "@/components/DocumentChat";
import { getDb } from "@/lib/db";
import { chats, documentFuentes, documents, messages as messagesTable } from "@/lib/db/schema";
import { obtenerUso, puedeSubirDocumentos } from "@/lib/usage";

export default async function DocumentoPage(
  props: PageProps<"/documentos/[id]">,
) {
  const { id } = await props.params;
  const { chat: chatIdParam } = await props.searchParams;
  const { userId } = await auth();
  if (!userId) notFound();

  const db = getDb();
  const [documento] = await db
    .select({ id: documents.id, title: documents.title })
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, userId)))
    .limit(1);
  if (!documento) notFound();

  const listaChats = await db
    .select({ id: chats.id, title: chats.title, updatedAt: chats.updatedAt })
    .from(chats)
    .where(eq(chats.documentId, id))
    .orderBy(asc(chats.createdAt));
  if (listaChats.length === 0) notFound();

  const chatIdSolicitado = Array.isArray(chatIdParam) ? chatIdParam[0] : chatIdParam;
  const chatActivo =
    listaChats.find((c) => c.id === chatIdSolicitado) ??
    [...listaChats].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];

  const filas = await db
    .select({
      id: messagesTable.id,
      role: messagesTable.role,
      parts: messagesTable.parts,
    })
    .from(messagesTable)
    .where(eq(messagesTable.chatId, chatActivo.id))
    .orderBy(asc(messagesTable.createdAt));

  const initialMessages: UIMessage[] = filas.map((fila) => ({
    id: fila.id,
    role: fila.role as UIMessage["role"],
    parts: fila.parts,
  }));

  const uso = await obtenerUso(userId);

  const fuentes = await db
    .select({
      id: documentFuentes.id,
      nombreArchivo: documentFuentes.nombreArchivo,
      paginas: documentFuentes.paginas,
    })
    .from(documentFuentes)
    .where(eq(documentFuentes.documentId, id))
    .orderBy(asc(documentFuentes.createdAt));

  return (
    <DocumentChat
      chatId={chatActivo.id}
      documentId={id}
      titulo={documento.title}
      initialMessages={initialMessages}
      uso={uso}
      fuentes={fuentes}
      chats={listaChats}
      tieneFuentes={fuentes.length > 0}
      puedeAgregarFuente={puedeSubirDocumentos(uso)}
    />
  );
}
