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
  todosLosArticulos,
} from "@/lib/corpus";
import { formatearBloquePatrones, hayAdjuntoEnMensajes } from "@/lib/patrones";
import { contarPaginasPdf, resolverArchivosParaModelo } from "@/lib/blob-server";
import { getDb } from "@/lib/db";
import { documents, messages as messagesTable } from "@/lib/db/schema";
import {
  obtenerUso,
  puedeSubirDocumentos,
  registrarAnalisisDocumento,
  registrarConsulta,
  tieneConsultasDisponibles,
} from "@/lib/usage";
import { LIMITE_PAGINAS_PDF } from "@/lib/usage-shared";

// Un análisis legal con el corpus completo inyectado puede tardar más de
// 30s en generarse; si la función se corta a mitad de la respuesta, el
// `onEnd` que la guarda en la base de datos nunca corre y el usuario la
// pierde al recargar. 300s es el máximo disponible en el plan actual.
export const maxDuration = 300;

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
  const enModoAuditoria = hayAdjuntoEnMensajes(messages);
  // En modo auditoría el documento adjunto puede citar cualquier artículo;
  // la búsqueda por palabras clave del chat no lo cubre, así que se inyecta
  // el corpus completo en vez de solo los más relevantes al texto del chat.
  const articulos = enModoAuditoria
    ? todosLosArticulos()
    : seleccionarArticulosRelevantes(textoDeMensajesUsuario(messages));
  const bloqueCorpus = formatearBloqueCorpus(articulos);
  const bloquePatrones = enModoAuditoria ? `\n\n${formatearBloquePatrones()}` : "";

  return `${leerSkill()}

[CORPUS LEGAL INYECTADO — Ley sobre el Régimen de Propiedad en Condominio del Estado de Yucatán]
Toda cita textual de "la ley dice..." debe venir de estos artículos; cita siempre el número.

${bloqueCorpus}${bloquePatrones}`;
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

  const { messages, documentId }: { messages: UIMessage[]; documentId: string } =
    await req.json();

  const db = getDb();
  const [documento] = await db
    .select({ id: documents.id, archivoAnalizado: documents.archivoAnalizado })
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
    .limit(1);
  if (!documento) {
    return Response.json({ error: "Documento no encontrado" }, { status: 404 });
  }

  const ultimoMensaje = messages.at(-1);
  if (ultimoMensaje?.role === "user") {
    const uso = await obtenerUso(userId);
    const archivosAdjuntos = ultimoMensaje.parts.filter((p) => p.type === "file");

    if (
      archivosAdjuntos.length > 0 &&
      !puedeSubirDocumentos(uso, documento.archivoAnalizado)
    ) {
      return Response.json(
        {
          error:
            "Ya usaste tu análisis de documento gratis. La suscripción estará disponible pronto.",
        },
        { status: 403 },
      );
    }

    if (archivosAdjuntos.length > 1) {
      return Response.json(
        { error: "Solo puedes adjuntar un archivo por análisis." },
        { status: 400 },
      );
    }

    for (const archivo of archivosAdjuntos) {
      const paginas = await contarPaginasPdf(archivo.url);
      if (paginas !== null && paginas > LIMITE_PAGINAS_PDF) {
        return Response.json(
          {
            error: `Este PDF tiene ${paginas} páginas; el límite es ${LIMITE_PAGINAS_PDF} para mantener la precisión del análisis.`,
          },
          { status: 400 },
        );
      }
    }

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
        documentId,
        role: ultimoMensaje.role,
        parts: ultimoMensaje.parts,
      })
      .onConflictDoNothing();

    await registrarConsulta(userId);
    if (archivosAdjuntos.length > 0 && !documento.archivoAnalizado) {
      await registrarAnalisisDocumento(userId, documentId);
    }
  }

  const mensajesParaModelo = await resolverArchivosParaModelo(messages);

  const result = streamText({
    model: anthropic("claude-sonnet-5"),
    instructions: construirSystemPrompt(messages),
    messages: await convertToModelMessages(mensajesParaModelo),
    onError: ({ error }) => {
      console.error("[api/chat] Error del modelo:", error);
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
        } catch (error) {
          console.error("[api/chat] Error al guardar la respuesta:", error);
        }
      },
    }),
  });
}
