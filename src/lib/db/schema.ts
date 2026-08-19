import type { UIMessagePart, UIDataTypes, UITools } from "ai";
import {
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// Contenedor de un chat (o varios, ver chats). No tiene un "tipo" fijo: un
// chat es simplemente un chat hasta que se le agrega una fuente, momento en
// el que empieza a comportarse como un análisis (ver documentFuentes) —
// nunca se elige de antemano.
export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    title: text("title").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    archivedAt: timestamp("archived_at"),
  },
  (table) => [index("documents_user_id_idx").on(table.userId)],
);

// Archivos fuente adjuntos a un documento. Viven fuera del historial de
// mensajes para poder agregarse/eliminarse independientemente de la
// conversación (estilo NotebookLM), y se inyectan completos en cada llamada
// al modelo mientras existan. Su sola presencia es lo que convierte un
// documento en "análisis".
export const documentFuentes = pgTable(
  "document_fuentes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    nombreArchivo: text("nombre_archivo").notNull(),
    url: text("url").notNull(),
    contentType: text("content_type").notNull(),
    paginas: integer("paginas"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("document_fuentes_document_id_idx").on(table.documentId)],
);

// Una conversación dentro de un documento. La mayoría de los documentos
// tienen exactamente un chat; si el usuario agrega más, todos comparten las
// mismas fuentes del documento — equivalente a los chats dentro de un
// Proyecto de Claude.
export const chats = pgTable(
  "chats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Conversación"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("chats_document_id_idx").on(table.documentId)],
);

export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey(),
    chatId: uuid("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    parts: jsonb("parts").notNull().$type<UIMessagePart<UIDataTypes, UITools>[]>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    // Solo se llenan en mensajes del asistente: uso real reportado por la
    // API de Anthropic para esa respuesta (no estimado), y su costo en USD
    // calculado con el precio vigente al momento de la llamada (ver
    // src/lib/pricing.ts).
    inputTokens: integer("input_tokens"),
    cacheReadTokens: integer("cache_read_tokens"),
    cacheWriteTokens: integer("cache_write_tokens"),
    outputTokens: integer("output_tokens"),
    costUsd: numeric("cost_usd", { precision: 10, scale: 6 }),
  },
  (table) => [
    index("messages_chat_id_created_at_idx").on(table.chatId, table.createdAt),
  ],
);

// Plan "free": limitado a LIMITE_CONSULTAS_GRATIS consultas y a
// LIMITE_DOCUMENTOS_GRATIS archivos subidos, de por vida. "subscription"
// permite varios archivos por análisis (hasta LIMITE_PAGINAS_ANALISIS
// páginas sumadas) y queda preparado para cuando se active el cobro.
export const userUsage = pgTable("user_usage", {
  userId: text("user_id").primaryKey(),
  plan: text("plan").notNull().default("free"),
  consultasUsadas: integer("consultas_usadas").notNull().default(0),
  documentosAnalizados: integer("documentos_analizados").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
