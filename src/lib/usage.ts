import "server-only";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { documents, userUsage } from "@/lib/db/schema";
import { LIMITE_CONSULTAS_GRATIS, puedeSubirDocumentos, type Uso } from "@/lib/usage-shared";

export { LIMITE_CONSULTAS_GRATIS, puedeSubirDocumentos };
export type { Uso };

export async function obtenerUso(userId: string): Promise<Uso> {
  // Fuera de producción (dev local, previews) no aplicamos el límite de
  // consultas/análisis gratis, para poder probar la app sin restricción.
  if (process.env.VERCEL_ENV !== "production") {
    return { plan: "subscription", consultasUsadas: 0, documentosAnalizados: 0 };
  }

  const [fila] = await getDb()
    .select({
      plan: userUsage.plan,
      consultasUsadas: userUsage.consultasUsadas,
      documentosAnalizados: userUsage.documentosAnalizados,
    })
    .from(userUsage)
    .where(eq(userUsage.userId, userId))
    .limit(1);

  if (!fila) return { plan: "free", consultasUsadas: 0, documentosAnalizados: 0 };
  return {
    plan: fila.plan as Uso["plan"],
    consultasUsadas: fila.consultasUsadas,
    documentosAnalizados: fila.documentosAnalizados,
  };
}

export function tieneConsultasDisponibles(uso: Uso): boolean {
  return uso.plan === "subscription" || uso.consultasUsadas < LIMITE_CONSULTAS_GRATIS;
}

export async function registrarConsulta(userId: string): Promise<void> {
  await getDb()
    .insert(userUsage)
    .values({ userId, consultasUsadas: 1 })
    .onConflictDoUpdate({
      target: userUsage.userId,
      set: {
        consultasUsadas: sql`${userUsage.consultasUsadas} + 1`,
        updatedAt: new Date(),
      },
    });
}

export async function documentoYaAnalizado(documentId: string): Promise<boolean> {
  const [fila] = await getDb()
    .select({ archivoAnalizado: documents.archivoAnalizado })
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);
  return fila?.archivoAnalizado ?? false;
}

export async function registrarAnalisisDocumento(
  userId: string,
  documentId: string,
): Promise<void> {
  await getDb()
    .update(documents)
    .set({ archivoAnalizado: true })
    .where(eq(documents.id, documentId));

  await getDb()
    .insert(userUsage)
    .values({ userId, documentosAnalizados: 1 })
    .onConflictDoUpdate({
      target: userUsage.userId,
      set: {
        documentosAnalizados: sql`${userUsage.documentosAnalizados} + 1`,
        updatedAt: new Date(),
      },
    });
}
