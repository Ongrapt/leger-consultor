"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq, sql } from "drizzle-orm";
import { del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { ARCHIVOS_PREFIX } from "@/lib/blob";
import { contarPaginas } from "@/lib/blob-server";
import { getDb } from "@/lib/db";
import { documentFuentes, documents } from "@/lib/db/schema";
import { obtenerUso, puedeSubirDocumentos, registrarArchivoAnalizado } from "@/lib/usage";
import { LIMITE_PAGINAS_ANALISIS, LIMITE_PAGINAS_PDF } from "@/lib/usage-shared";

export async function agregarFuente(
  documentId: string,
  fuente: { nombreArchivo: string; url: string; contentType: string },
) {
  const { userId } = await auth();
  if (!userId) throw new Error("No autorizado");

  const db = getDb();
  const [documento] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
    .limit(1);
  if (!documento) throw new Error("Documento no encontrado");

  const uso = await obtenerUso(userId);
  if (!puedeSubirDocumentos(uso)) {
    throw new Error("Ya usaste tu archivo gratis. La suscripción estará disponible pronto.");
  }

  // Se recalculan las páginas en el servidor en vez de confiar en lo que
  // mande el cliente.
  const paginas = await contarPaginas(fuente.url);
  if (paginas !== null && paginas > LIMITE_PAGINAS_PDF) {
    throw new Error(
      `Este archivo tiene ${paginas} páginas; el límite es ${LIMITE_PAGINAS_PDF} por archivo.`,
    );
  }

  const [fila] = await db
    .select({ total: sql`coalesce(sum(${documentFuentes.paginas}), 0)` })
    .from(documentFuentes)
    .where(eq(documentFuentes.documentId, documentId));
  // sum() en Postgres devuelve numeric/bigint, que el driver entrega como
  // string; hay que convertirlo explícitamente antes de sumarlo.
  const total = Number(fila.total);
  const paginasNuevas = paginas ?? 0;
  if (total + paginasNuevas > LIMITE_PAGINAS_ANALISIS) {
    throw new Error(
      `Este análisis ya tiene ${total} páginas; agregar este archivo lo llevaría a ${
        total + paginasNuevas
      }, por encima del límite de ${LIMITE_PAGINAS_ANALISIS}.`,
    );
  }

  await db.insert(documentFuentes).values({ documentId, ...fuente, paginas });
  if (uso.plan === "free") {
    await registrarArchivoAnalizado(userId);
  }
  await db.update(documents).set({ updatedAt: new Date() }).where(eq(documents.id, documentId));

  revalidatePath(`/documentos/${documentId}`);
}

export async function eliminarFuente(fuenteId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("No autorizado");

  const db = getDb();
  const [fuente] = await db
    .select({
      id: documentFuentes.id,
      documentId: documentFuentes.documentId,
      url: documentFuentes.url,
    })
    .from(documentFuentes)
    .innerJoin(documents, eq(documents.id, documentFuentes.documentId))
    .where(and(eq(documentFuentes.id, fuenteId), eq(documents.userId, userId)))
    .limit(1);
  if (!fuente) throw new Error("Fuente no encontrada");

  await db.delete(documentFuentes).where(eq(documentFuentes.id, fuenteId));

  try {
    const pathname = fuente.url.startsWith(ARCHIVOS_PREFIX)
      ? fuente.url.slice(ARCHIVOS_PREFIX.length)
      : fuente.url;
    await del(pathname);
  } catch (error) {
    console.error("[fuentes] Error al borrar el archivo en blob storage:", error);
  }

  revalidatePath(`/documentos/${fuente.documentId}`);
}
