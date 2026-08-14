import type { UIMessagePart, UIDataTypes, UITools } from "ai";
import {
  index,
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
