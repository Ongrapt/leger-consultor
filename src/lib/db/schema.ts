import type { UIMessagePart, UIDataTypes, UITools } from "ai";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    title: text("title").notNull(),
    // Marca si ya se adjuntó un archivo a este documento; consume el cupo de
    // LIMITE_DOCUMENTOS_GRATIS la primera vez, adjuntos posteriores al mismo
    // documento no vuelven a contar.
    archivoAnalizado: boolean("archivo_analizado").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("documents_user_id_idx").on(table.userId)],
);

export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    parts: jsonb("parts").notNull().$type<UIMessagePart<UIDataTypes, UITools>[]>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("messages_document_id_created_at_idx").on(
      table.documentId,
      table.createdAt,
    ),
  ],
);

// Plan "free": limitado a LIMITE_CONSULTAS_GRATIS consultas y a
// LIMITE_DOCUMENTOS_GRATIS documentos analizados. "subscription" queda
// preparado para cuando se active el cobro.
export const userUsage = pgTable("user_usage", {
  userId: text("user_id").primaryKey(),
  plan: text("plan").notNull().default("free"),
  consultasUsadas: integer("consultas_usadas").notNull().default(0),
  documentosAnalizados: integer("documentos_analizados").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
