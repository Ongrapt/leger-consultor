"use server";

import { auth } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { documents } from "@/lib/db/schema";

export async function crearDocumento(titulo: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("No autorizado");

  const tituloLimpio = titulo.trim();
  if (!tituloLimpio) throw new Error("El título no puede estar vacío");

  const [documento] = await getDb()
    .insert(documents)
    .values({ userId, title: tituloLimpio })
    .returning({ id: documents.id });

  revalidatePath("/", "layout");
  redirect(`/documentos/${documento.id}`);
}

export async function eliminarDocumento(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("No autorizado");

  await getDb()
    .delete(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, userId)));

  revalidatePath("/", "layout");
}

export async function listarDocumentos() {
  const { userId } = await auth();
  if (!userId) return [];

  return getDb()
    .select({
      id: documents.id,
      title: documents.title,
      updatedAt: documents.updatedAt,
    })
    .from(documents)
    .where(eq(documents.userId, userId))
    .orderBy(desc(documents.updatedAt));
}
