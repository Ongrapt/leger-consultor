import { anthropic } from "@ai-sdk/anthropic";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  SystemModelMessage,
  UIMessage,
} from "ai";
import { auth } from "@clerk/nextjs/server";
import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import fs from "node:fs";
import path from "node:path";
import {
  formatearBloqueCorpus,
  seleccionarArticulosRelevantes,
  todosLosArticulos,
} from "@/lib/corpus";
import { formatearBloquePatrones } from "@/lib/patrones";
import { resolverFuentesParaModelo } from "@/lib/blob-server";
import { getDb } from "@/lib/db";
import { chats, documentFuentes, documents, messages as messagesTable } from "@/lib/db/schema";
import { calcularCostoUsd } from "@/lib/pricing";
import { obtenerUso, registrarConsulta, tieneConsultasDisponibles } from "@/lib/usage";

// Un análisis legal con el corpus completo inyectado puede tardar más de
// 30s en generarse; si la función se corta a mitad de la respuesta, el
// `onEnd` que la guarda en la base de datos nunca corre y el usuario la
// pierde al recargar. 300s es el máximo disponible en el plan actual.
export const maxDuration = 300;

const SKILL_PATH = path.join(process.cwd(), "SKILL.md");
const CACHE_EFIMERO = { type: "ephemeral" as const };

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

// El prompt se divide en bloques para aprovechar el Prompt Caching de
// Anthropic (mismo SKILL.md, corpus y patrones de siempre — nada de su
// contenido cambia aquí, solo cómo se empaquetan para la llamada):
//  - SKILL.md + encabezado del corpus: siempre idénticos, byte a byte, en
//    cualquier conversación → se cachean siempre.
//  - En modo auditoría, el corpus completo + los patrones también son
//    siempre el mismo texto (no dependen del chat), así que todo el prompt
//    se cachea como un solo bloque.
//  - Fuera de modo auditoría, el corpus sí varía según la conversación
//    (seleccionarArticulosRelevantes), así que ese bloque va sin caché.
function construirInstructions(
  messages: UIMessage[],
  enModoAuditoria: boolean,
): SystemModelMessage[] {
  const encabezado = `${leerSkill()}

[CORPUS LEGAL INYECTADO — Ley sobre el Régimen de Propiedad en Condominio del Estado de Yucatán]
Toda cita textual de "la ley dice..." debe venir de estos artículos; cita siempre el número.

`;

  const articulos = enModoAuditoria
    ? todosLosArticulos()
    : seleccionarArticulosRelevantes(textoDeMensajesUsuario(messages));
  const bloqueCorpus = formatearBloqueCorpus(articulos);
  const bloquePatrones = enModoAuditoria ? `\n\n${formatearBloquePatrones()}` : "";
  const cuerpo = `${bloqueCorpus}${bloquePatrones}`;

  if (!enModoAuditoria) {
    return [
      {
        role: "system",
        content: encabezado,
        providerOptions: { anthropic: { cacheControl: CACHE_EFIMERO } },
      },
      { role: "system", content: cuerpo },
    ];
  }

  return [
    {
      role: "system",
      content: `${encabezado}${cuerpo}`,
      providerOptions: {
        anthropic: { cacheControl: { type: "ephemeral", ttl: "1h" } },
      },
    },
  ];
}

export async function POST(req: Request) {
  try {
    return await manejarPost(req);
  } catch (error) {
    console.error("[api/chat] Error inesperado:", error);
    return Response.json({ error: "Ocurrió un error inesperado." }, { status: 500 });
  }
}

async function manejarPost(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const { messages, chatId }: { messages: UIMessage[]; chatId: string } = await req.json();

  const db = getDb();
  const [chatDoc] = await db
    .select({ documentId: documents.id })
    .from(chats)
    .innerJoin(documents, eq(documents.id, chats.documentId))
    .where(and(eq(chats.id, chatId), eq(documents.userId, userId)))
    .limit(1);
  if (!chatDoc) {
    return Response.json({ error: "Chat no encontrado" }, { status: 404 });
  }

  const documentId = chatDoc.documentId;

  const ultimoMensaje = messages.at(-1);
  if (ultimoMensaje?.role === "user") {
    const uso = await obtenerUso(userId);

    if (!tieneConsultasDisponibles(uso)) {
      return Response.json(
        {
          error: `Alcanzaste el límite de ${uso.consultasUsadas} consultas gratis. La suscripción estará disponible pronto.`,
        },
        { status: 403 },
      );
    }

    await db
      .insert(messagesTable)
      .values({
        id: ultimoMensaje.id,
        chatId,
        role: ultimoMensaje.role,
        parts: ultimoMensaje.parts,
      })
      .onConflictDoNothing();

    await registrarConsulta(userId);
  }

  // Orden estable y explícito: cada fuente es su propio bloque de caché de
  // Anthropic, así que si el orden cambiara entre llamadas se invalidaría
  // todo el caché de archivos sin necesidad.
  const fuentes = await db
    .select({
      url: documentFuentes.url,
      contentType: documentFuentes.contentType,
      nombreArchivo: documentFuentes.nombreArchivo,
    })
    .from(documentFuentes)
    .where(eq(documentFuentes.documentId, documentId))
    .orderBy(asc(documentFuentes.createdAt));

  const enModoAuditoria = fuentes.length > 0;
  const partesFuentes = await resolverFuentesParaModelo(fuentes);

  // Las fuentes se inyectan siempre en el PRIMER mensaje (no en el último):
  // así ocupan una posición fija en cada llamada, sin importar cuánto haya
  // crecido la conversación, que es lo que permite que Anthropic reconozca
  // el mismo prefijo y sirva ese bloque desde caché en vez de reprocesarlo.
  let mensajesParaModelo = messages;
  if (partesFuentes.length > 0 && messages.length > 0) {
    const [primerMensaje, ...resto] = messages;
    mensajesParaModelo = [
      { ...primerMensaje, parts: [...partesFuentes, ...primerMensaje.parts] },
      ...resto,
    ];
  }

  // onFinish (streamText) llega antes que onEnd (toUIMessageStream, más
  // abajo) porque este último depende de que result.stream termine de
  // fluir; se captura aquí para poder guardar el uso real junto con el
  // mensaje del asistente en vez de solo loguearlo.
  let usoTokens: {
    inputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    outputTokens: number;
    costoUsd: number;
  } | null = null;

  const result = streamText({
    model: anthropic("claude-sonnet-5"),
    instructions: construirInstructions(messages, enModoAuditoria),
    messages: await convertToModelMessages(mensajesParaModelo),
    onError: ({ error }) => {
      console.error("[api/chat] Error del modelo:", error);
    },
    onFinish: ({ usage }) => {
      const sinCache = usage.inputTokenDetails.noCacheTokens ?? 0;
      const lecturaCache = usage.inputTokenDetails.cacheReadTokens ?? 0;
      const escrituraCache = usage.inputTokenDetails.cacheWriteTokens ?? 0;
      const salida = usage.outputTokens ?? 0;
      const costoUsd = calcularCostoUsd({
        sinCache,
        lecturaCache,
        escrituraCache,
        salida,
      });
      usoTokens = {
        inputTokens: usage.inputTokens ?? sinCache + lecturaCache + escrituraCache,
        cacheReadTokens: lecturaCache,
        cacheWriteTokens: escrituraCache,
        outputTokens: salida,
        costoUsd,
      };
      console.log(
        `[api/chat] Uso de tokens — sin caché: ${sinCache}, lectura de caché: ${lecturaCache}, ` +
          `escritura de caché: ${escrituraCache}, salida: ${salida}, costo: $${costoUsd.toFixed(4)}`,
      );
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: messages,
      generateMessageId: () => crypto.randomUUID(),
      onError: (error) => {
        console.error("[api/chat] Error de streaming:", error);
        return "Ocurrió un error al generar la respuesta. Intenta de nuevo.";
      },
      onEnd: async ({ responseMessage }) => {
        try {
          await db
            .insert(messagesTable)
            .values({
              id: responseMessage.id,
              chatId,
              role: responseMessage.role,
              parts: responseMessage.parts,
              inputTokens: usoTokens?.inputTokens,
              cacheReadTokens: usoTokens?.cacheReadTokens,
              cacheWriteTokens: usoTokens?.cacheWriteTokens,
              outputTokens: usoTokens?.outputTokens,
              costUsd: usoTokens ? usoTokens.costoUsd.toFixed(6) : undefined,
            })
            .onConflictDoNothing();
          await db.update(chats).set({ updatedAt: new Date() }).where(eq(chats.id, chatId));
          await db
            .update(documents)
            .set({ updatedAt: new Date() })
            .where(eq(documents.id, documentId));
          revalidatePath("/", "layout");
        } catch (error) {
          console.error("[api/chat] Error al guardar la respuesta:", error);
        }
      },
    }),
  });
}
