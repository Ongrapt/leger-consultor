import { anthropic } from "@ai-sdk/anthropic";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  UIMessage,
} from "ai";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import fs from "node:fs";
import path from "node:path";
import {
  formatearBloqueCorpus,
  seleccionarArticulosRelevantes,
} from "@/lib/corpus";
import { resolverArchivosParaModelo } from "@/lib/blob-server";
import { getDb } from "@/lib/db";
import { documents, messages as messagesTable } from "@/lib/db/schema";

export const maxDuration = 30;

const SKILL_PATH = path.join(process.cwd(), "SKILL.md");

function leerSkill(): string {
  return fs.readFileSync(SKILL_PATH, "utf-8");
}

function textoDeMensajesUsuario(messages: UIMessage[]): string {
  return messages
    .filter((m) => m.role === "user")
    .flatMap((m) =>
      m.parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text),
    )
    .join(" ");
}

function construirSystemPrompt(messages: UIMessage[]): string {
  const consulta = textoDeMensajesUsuario(messages);
  const articulos = seleccionarArticulosRelevantes(consulta);
  const bloqueCorpus = formatearBloqueCorpus(articulos);

  return `${leerSkill()}

[CORPUS LEGAL INYECTADO — Ley sobre el Régimen de Propiedad en Condominio del Estado de Yucatán]
Toda cita textual de "la ley dice..." debe venir de estos artículos; cita siempre el número.

${bloqueCorpus}`;
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const { messages, documentId }: { messages: UIMessage[]; documentId: string } =
    await req.json();

  const db = getDb();
  const [documento] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
    .limit(1);
  if (!documento) {
    return Response.json({ error: "Documento no encontrado" }, { status: 404 });
  }

  const ultimoMensaje = messages.at(-1);
  if (ultimoMensaje?.role === "user") {
    await db
      .insert(messagesTable)
      .values({
        id: ultimoMensaje.id,
        documentId,
        role: ultimoMensaje.role,
        parts: ultimoMensaje.parts,
      })
      .onConflictDoNothing();
  }

  const mensajesParaModelo = await resolverArchivosParaModelo(messages);

  const result = streamText({
    model: anthropic("claude-sonnet-5"),
    instructions: construirSystemPrompt(messages),
    messages: await convertToModelMessages(mensajesParaModelo),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: messages,
      generateMessageId: () => crypto.randomUUID(),
      onEnd: async ({ responseMessage }) => {
        await db
          .insert(messagesTable)
          .values({
            id: responseMessage.id,
            documentId,
            role: responseMessage.role,
            parts: responseMessage.parts,
          })
          .onConflictDoNothing();
        await db
          .update(documents)
          .set({ updatedAt: new Date() })
          .where(eq(documents.id, documentId));
        revalidatePath("/", "layout");
      },
    }),
  });
}
