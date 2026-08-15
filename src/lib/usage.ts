import "server-only";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { userUsage } from "@/lib/db/schema";
import { LIMITE_CONSULTAS_GRATIS, puedeSubirDocumentos, type Uso } from "@/lib/usage-shared";

export { LIMITE_CONSULTAS_GRATIS, puedeSubirDocumentos };
export type { Uso };

export async function obtenerUso(userId: string): Promise<Uso> {
  const [fila] = await getDb()
    .select({
      plan: userUsage.plan,
      consultasUsadas: userUsage.consultasUsadas,
    })
    .from(userUsage)
    .where(eq(userUsage.userId, userId))
    .limit(1);

  if (!fila) return { plan: "free", consultasUsadas: 0 };
  return { plan: fila.plan as Uso["plan"], consultasUsadas: fila.consultasUsadas };
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
