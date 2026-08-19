"use server";

import { auth } from "@clerk/nextjs/server";
import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { chats, documents } from "@/lib/db/schema";

async function verificarPropietario(documentId: string, userId: string) {
  const [documento] = await getDb()
    .select({ id: documents.id })
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
    .limit(1);
  return documento ?? null;
}

export async function crearChat(documentId: string, titulo: string = "Conversación") {
  const { userId } = await auth();
  if (!userId) throw new Error("No autorizado");

  const documento = await verificarPropietario(documentId, userId);
  if (!documento) throw new Error("Documento no encontrado");

  const [chat] = await getDb()
    .insert(chats)
    .values({ documentId, title: titulo })
    .returning({ id: chats.id });

  revalidatePath(`/documentos/${documentId}`);
  redirect(`/documentos/${documentId}?chat=${chat.id}`);
}

export async function eliminarChat(chatId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("No autorizado");

  const db = getDb();
  const [chat] = await db
    .select({ id: chats.id, documentId: chats.documentId })
    .from(chats)
    .innerJoin(documents, eq(documents.id, chats.documentId))
    .where(and(eq(chats.id, chatId), eq(documents.userId, userId)))
    .limit(1);
  if (!chat) throw new Error("Chat no encontrado");

  await db.delete(chats).where(eq(chats.id, chatId));

  revalidatePath(`/documentos/${chat.documentId}`);
  return { documentId: chat.documentId };
}

// Todos los chats de todos los documentos del usuario, para poder anidarlos
// bajo cada documento en el menú lateral sin una ida y vuelta por documento.
export async function listarTodosLosChats() {
  const { userId } = await auth();
  if (!userId) return [];

  return getDb()
    .select({ id: chats.id, documentId: chats.documentId, title: chats.title })
    .from(chats)
    .innerJoin(documents, eq(documents.id, chats.documentId))
    .where(eq(documents.userId, userId))
    .orderBy(asc(chats.createdAt));
}
