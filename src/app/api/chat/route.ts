import { anthropic } from "@ai-sdk/anthropic";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  UIMessage,
} from "ai";
import fs from "node:fs";
import path from "node:path";
import {
  formatearBloqueCorpus,
  seleccionarArticulosRelevantes,
} from "@/lib/corpus";

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
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: anthropic("claude-sonnet-5"),
    instructions: construirSystemPrompt(messages),
    messages: await convertToModelMessages(messages),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
