"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Streamdown } from "streamdown";
import "streamdown/styles.css";
import FuentesPanel from "@/components/FuentesPanel";
import ItemMenu from "@/components/ItemMenu";
import ModeToggle from "@/components/ModeToggle";
import RenombrarModal from "@/components/RenombrarModal";
import WatchBackground from "@/components/WatchBackground";
import { crearChat } from "@/lib/actions/chats";
import { archivarDocumento, eliminarDocumento } from "@/lib/actions/documentos";
import { tomarMensajeInicial } from "@/lib/pending-message";
import type { ChatMode } from "@/lib/types";
import {
  LIMITE_CONSULTAS_GRATIS,
  LIMITE_DOCUMENTOS_GRATIS,
  LIMITE_PAGINAS_PDF,
  type Uso,
} from "@/lib/usage-shared";

type Fuente = { id: string; nombreArchivo: string; paginas: number | null };
type ChatVinculado = { id: string; title: string; updatedAt: Date };

export default function DocumentChat({
  chatId,
  documentId,
  titulo,
  initialMessages,
  uso,
  fuentes,
  chats,
  tieneFuentes,
  puedeAgregarFuente,
}: {
  chatId: string;
  documentId: string;
  titulo: string;
  initialMessages: UIMessage[];
  uso: Uso;
  fuentes: Fuente[];
  chats: ChatVinculado[];
  tieneFuentes: boolean;
  puedeAgregarFuente: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const { messages, sendMessage, status, error } = useChat({
    id: chatId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { chatId },
    }),
    onError: (error) => {
      console.error("[chat] Error en la petición:", error);
    },
  });
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [renombrando, setRenombrando] = useState(false);
  const [mostrarFuentes, setMostrarFuentes] = useState(true);
  // El composer de inicio deja el mensaje (y el modo elegido) en
  // sessionStorage antes de redirigir aquí, porque crearDocumento hace el
  // redirect del lado del servidor y no puede devolver esos datos como prop.
  const [mensajePendiente] = useState(() =>
    initialMessages.length === 0 ? tomarMensajeInicial() : null,
  );
  const [modoElegido, setModoElegido] = useState<ChatMode>(mensajePendiente?.modo ?? "chat");
  // Un documento con fuentes ya es un análisis: no se puede "bajar" a chat.
  const mode: ChatMode = tieneFuentes ? "analisis" : modoElegido;
  const yaEnvioMensajePendiente = useRef(false);

  useEffect(() => {
    if (!mensajePendiente || yaEnvioMensajePendiente.current) return;
    yaEnvioMensajePendiente.current = true;
    sendMessage({ text: mensajePendiente.texto });
  }, [mensajePendiente, sendMessage]);

  function handleArchivarDocumento() {
    startTransition(async () => {
      await archivarDocumento(documentId);
      router.push("/");
    });
  }

  function handleEliminarDocumento() {
    const confirmado = window.confirm(
      `¿Eliminar "${titulo}"? Se perderá toda su conversación y fuentes.`,
    );
    if (!confirmado) return;
    startTransition(async () => {
      await eliminarDocumento(documentId);
      router.push("/");
    });
  }

  function handleNuevoChat() {
    startTransition(async () => {
      await crearChat(documentId, `Conversación ${chats.length + 1}`);
    });
  }

  const consultasRestantes = Math.max(
    0,
    LIMITE_CONSULTAS_GRATIS - uso.consultasUsadas,
  );
  const limiteAlcanzado = uso.plan === "free" && consultasRestantes <= 0;

  const isBusy = status === "submitted" || status === "streaming";
  const ultimoMensaje = messages.at(-1);
  const textoUltimoMensaje =
    ultimoMensaje?.parts
      .filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
      .map((p) => p.text)
      .join("") ?? "";
  // No basta con status === "submitted" (ventana muy corta): el SDK crea el
  // mensaje del asistente vacío en cuanto pasa a "streaming", así que hay
  // que seguir mostrando los puntos hasta que ese mensaje tenga texto real.
  const esperandoRespuesta =
    isBusy && (ultimoMensaje?.role !== "assistant" || textoUltimoMensaje.trim() === "");
  const mensajeError = error
    ? (() => {
        try {
          return (JSON.parse(error.message) as { error?: string }).error ?? error.message;
        } catch {
          return error.message;
        }
      })()
    : null;

  async function copiarMensaje(message: UIMessage) {
    const texto = message.parts
      .filter((part): part is Extract<typeof part, { type: "text" }> => part.type === "text")
      .map((part) => part.text)
      .join("\n\n");
    if (!texto) return;
    await navigator.clipboard.writeText(texto);
    setCopiedId(message.id);
    setTimeout(() => setCopiedId((current) => (current === message.id ? null : current)), 1500);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isBusy || limiteAlcanzado) return;
    sendMessage({ text: input });
    setInput("");
  }

  const esLanding = messages.length === 0;
  const otrosChats = chats.filter((c) => c.id !== chatId);

  return (
    <WatchBackground className="flex h-full flex-col items-center">
      <div className="flex w-full max-w-3xl shrink-0 items-center justify-between px-4 pt-4">
        <h1 className="truncate text-sm font-medium text-foreground/60">{titulo}</h1>
        <ItemMenu
          onRename={() => setRenombrando(true)}
          onArchive={handleArchivarDocumento}
          onDelete={handleEliminarDocumento}
        />
      </div>
      {renombrando && (
        <RenombrarModal
          documentId={documentId}
          tituloActual={titulo}
          onClose={() => setRenombrando(false)}
        />
      )}

      <main className="flex w-full max-w-3xl flex-1 flex-col overflow-y-auto px-4">
        {esLanding ? (
          <div className="flex flex-1 flex-col justify-center gap-6 py-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <p className="text-2xl font-medium text-foreground/80">
                ¿En qué puedo ayudarte hoy?
              </p>
              <p className="max-w-md text-sm text-foreground/50">
                Consultor de Procesos Administrativos en Condominio, basado en
                la Ley de Propiedad en Condominio de Yucatán.
              </p>
            </div>

            {mode === "analisis" && (
              <FuentesPanel documentId={documentId} fuentes={fuentes} puedeAgregar={puedeAgregarFuente} />
            )}

            {otrosChats.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-medium uppercase tracking-wide text-foreground/40">
                  Recientes
                </p>
                <ul className="flex flex-col gap-1">
                  {otrosChats.map((chat) => (
                    <li key={chat.id}>
                      <Link
                        href={`/documentos/${documentId}?chat=${chat.id}`}
                        className="block truncate rounded-xl border border-border px-3 py-2 text-sm text-foreground/70 transition-colors hover:bg-surface hover:text-foreground"
                      >
                        {chat.title}
                      </Link>
                    </li>
                  ))}
                  <li>
                    <button
                      type="button"
                      onClick={handleNuevoChat}
                      className="w-full rounded-xl border border-dashed border-border px-3 py-2 text-left text-sm text-foreground/40 transition-colors hover:bg-surface hover:text-foreground"
                    >
                      + Nuevo chat
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-6 py-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex flex-col ${
                  message.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
                    message.role === "user"
                      ? "whitespace-pre-wrap bg-surface text-foreground"
                      : "text-foreground"
                  }`}
                >
                  {message.parts.map((part, i) => {
                    const key = `${message.id}-${i}`;
                    if (part.type === "text") {
                      if (message.role === "user") {
                        return <span key={key}>{part.text}</span>;
                      }
                      return (
                        <Streamdown
                          key={key}
                          isAnimating={status === "streaming"}
                        >
                          {part.text}
                        </Streamdown>
                      );
                    }
                    return null;
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => copiarMensaje(message)}
                  aria-label={
                    message.role === "assistant" ? "Copiar respuesta" : "Copiar consulta"
                  }
                  className="mt-1 flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-foreground/40 transition-colors hover:bg-background/50 hover:text-foreground/70"
                >
                  {copiedId === message.id ? (
                    <>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      >
                        <path
                          d="M20 6L9 17l-5-5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Copiado
                    </>
                  ) : (
                    <>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      >
                        <rect
                          x="9"
                          y="9"
                          width="13"
                          height="13"
                          rx="2"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                        <path
                          d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                      </svg>
                      Copiar
                    </>
                  )}
                </button>
              </div>
            ))}
            {esperandoRespuesta && (
              <div className="flex justify-start px-1 py-2" aria-label="Leger está escribiendo">
                <span
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="ml-1 h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="ml-1 h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            )}
          </div>
        )}
      </main>

      <div className="w-full max-w-3xl px-4 pb-6 pt-2">
        {(mensajeError || limiteAlcanzado) && (
          <div className="mb-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-600">
            {mensajeError ??
              `Alcanzaste el límite de ${LIMITE_CONSULTAS_GRATIS} consultas gratis. La suscripción estará disponible pronto.`}
          </div>
        )}

        {!esLanding && mode === "analisis" && (
          <div className="mb-2">
            <button
              type="button"
              onClick={() => setMostrarFuentes((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-surface"
            >
              <span aria-hidden="true">📎</span>
              {fuentes.length > 0
                ? `${fuentes.length} ${fuentes.length === 1 ? "documento" : "documentos"} · agregar más`
                : "Agregar documento"}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className={`h-3 w-3 transition-transform ${mostrarFuentes ? "rotate-90" : ""}`}
                aria-hidden="true"
              >
                <path
                  d="M9 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {mostrarFuentes && (
              <div className="mt-1.5">
                <FuentesPanel
                  documentId={documentId}
                  fuentes={fuentes}
                  puedeAgregar={puedeAgregarFuente}
                  onSubido={() => setMostrarFuentes(false)}
                />
              </div>
            )}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-2 rounded-3xl border border-border bg-surface px-4 py-3 shadow-sm"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isBusy || limiteAlcanzado}
            placeholder={
              limiteAlcanzado
                ? "Alcanzaste el límite de consultas gratis"
                : "Escribe tu mensaje a Leger…"
            }
            className="w-full bg-transparent text-[15px] text-foreground placeholder:text-foreground/40 outline-none disabled:opacity-60"
          />
          <div className="flex items-center justify-between gap-2">
            <ModeToggle mode={mode} onChange={setModoElegido} analisisBloqueado={tieneFuentes} />
            <div className="flex items-center gap-2">
              {mode === "chat" ? (
                uso.plan === "free" && (
                  <span className="text-xs text-foreground/40">
                    {consultasRestantes} / {LIMITE_CONSULTAS_GRATIS} gratis
                  </span>
                )
              ) : (
                <span className="hidden text-xs text-foreground/40 sm:inline">
                  {puedeAgregarFuente
                    ? `${LIMITE_DOCUMENTOS_GRATIS} documento gratis · hasta ${LIMITE_PAGINAS_PDF} páginas`
                    : "Suscripción mensual próximamente"}
                </span>
              )}
              <button
                type="submit"
                disabled={isBusy || limiteAlcanzado || !input.trim()}
                aria-label="Enviar"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-opacity disabled:opacity-30"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path
                    d="M12 19V5M12 5L5 12M12 5l7 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </form>
      </div>
    </WatchBackground>
  );
}
