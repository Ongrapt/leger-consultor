"use server";

import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { chats, documentFuentes, documents } from "@/lib/db/schema";

// Sin redirect, para flujos que necesitan el id antes de navegar (por
// ejemplo: subir un archivo justo después de crear el documento).
export async function crearDocumentoConId(titulo: string): Promise<{ id: string }> {
  const { userId } = await auth();
  if (!userId) throw new Error("No autorizado");

  const tituloLimpio = titulo.trim();
  if (!tituloLimpio) throw new Error("El título no puede estar vacío");

  const db = getDb();
  const [documento] = await db
    .insert(documents)
    .values({ userId, title: tituloLimpio })
    .returning({ id: documents.id });

  // Todo documento arranca con un chat; si más tarde se le agregan fuentes
  // se comporta como análisis, y se le pueden sumar más chats.
  await db.insert(chats).values({ documentId: documento.id, title: tituloLimpio });

  revalidatePath("/", "layout");
  return { id: documento.id };
}

export async function crearDocumento(titulo: string) {
  const { id } = await crearDocumentoConId(titulo);
  redirect(`/documentos/${id}`);
}

export async function eliminarDocumento(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("No autorizado");

  await getDb()
    .delete(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, userId)));

  revalidatePath("/", "layout");
}

export async function renombrarDocumento(id: string, nuevoTitulo: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("No autorizado");

  const tituloLimpio = nuevoTitulo.trim();
  if (!tituloLimpio) throw new Error("El título no puede estar vacío");

  await getDb()
    .update(documents)
    .set({ title: tituloLimpio, updatedAt: new Date() })
    .where(and(eq(documents.id, id), eq(documents.userId, userId)));

  revalidatePath("/", "layout");
  revalidatePath(`/documentos/${id}`);
}

export async function archivarDocumento(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("No autorizado");

  await getDb()
    .update(documents)
    .set({ archivedAt: new Date() })
    .where(and(eq(documents.id, id), eq(documents.userId, userId)));

  revalidatePath("/", "layout");
}

export async function desarchivarDocumento(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("No autorizado");

  await getDb()
    .update(documents)
    .set({ archivedAt: null })
    .where(and(eq(documents.id, id), eq(documents.userId, userId)));

  revalidatePath("/", "layout");
}

// Incluye las fuentes de cada documento para poder mostrarlas en el árbol de
// la barra lateral (Análisis > Fuentes) sin una consulta por documento.
export async function listarDocumentos() {
  const { userId } = await auth();
  if (!userId) return [];

  const db = getDb();
  const docs = await db
    .select({
      id: documents.id,
      title: documents.title,
      updatedAt: documents.updatedAt,
    })
    .from(documents)
    .where(and(eq(documents.userId, userId), isNull(documents.archivedAt)))
    .orderBy(desc(documents.updatedAt));

  if (docs.length === 0) return docs.map((doc) => ({ ...doc, fuentes: [] }));

  const fuentesRows = await db
    .select({
      documentId: documentFuentes.documentId,
      id: documentFuentes.id,
      nombreArchivo: documentFuentes.nombreArchivo,
      paginas: documentFuentes.paginas,
    })
    .from(documentFuentes)
    .innerJoin(documents, eq(documents.id, documentFuentes.documentId))
    .where(and(eq(documents.userId, userId), isNull(documents.archivedAt)));

  const fuentesPorDocumento = new Map<string, typeof fuentesRows>();
  for (const fila of fuentesRows) {
    const lista = fuentesPorDocumento.get(fila.documentId) ?? [];
    lista.push(fila);
    fuentesPorDocumento.set(fila.documentId, lista);
  }

  return docs.map((doc) => ({ ...doc, fuentes: fuentesPorDocumento.get(doc.id) ?? [] }));
}

export async function listarDocumentosArchivados() {
  const { userId } = await auth();
  if (!userId) return [];

  return getDb()
    .select({
      id: documents.id,
      title: documents.title,
      updatedAt: documents.updatedAt,
    })
    .from(documents)
    .where(and(eq(documents.userId, userId), isNotNull(documents.archivedAt)))
    .orderBy(desc(documents.updatedAt));
}
