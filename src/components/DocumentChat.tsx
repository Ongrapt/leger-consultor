"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type FileUIPart, type UIMessage } from "ai";
import { upload } from "@vercel/blob/client";
import { PDFDocument } from "pdf-lib";
import { useRef, useState } from "react";
import { Streamdown } from "streamdown";
import "streamdown/styles.css";
import WatchBackground from "@/components/WatchBackground";
import { pathnameParaDocumento, urlProxyDeArchivo } from "@/lib/blob";
import {
  LIMITE_CONSULTAS_GRATIS,
  LIMITE_DOCUMENTOS_GRATIS,
  LIMITE_PAGINAS_PDF,
  puedeSubirDocumentos as puedeSubirDocumentosSegunUso,
  type Uso,
} from "@/lib/usage-shared";

export default function DocumentChat({
  documentId,
  initialMessages,
  uso,
  documentoYaAnalizado,
}: {
  documentId: string;
  initialMessages: UIMessage[];
  uso: Uso;
  documentoYaAnalizado: boolean;
}) {
  const { messages, sendMessage, status, error } = useChat({
    id: documentId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { documentId },
    }),
  });
  const [input, setInput] = useState("");
  const [archivos, setArchivos] = useState<FileList | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const puedeSubirDocumentos = puedeSubirDocumentosSegunUso(uso, documentoYaAnalizado);
  const consultasRestantes = Math.max(
    0,
    LIMITE_CONSULTAS_GRATIS - uso.consultasUsadas,
  );
  const documentosRestantes = Math.max(
    0,
    LIMITE_DOCUMENTOS_GRATIS - uso.documentosAnalizados,
  );
  const limiteAlcanzado = uso.plan === "free" && consultasRestantes <= 0;

  const isBusy = status === "submitted" || status === "streaming" || subiendo;
  const hayArchivos = !!archivos && archivos.length > 0;
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if ((!input.trim() && !hayArchivos) || isBusy || limiteAlcanzado) return;
    if (hayArchivos && !puedeSubirDocumentos) return;

    if (hayArchivos) {
      const archivo = archivos![0];
      if (archivo.type === "application/pdf") {
        const doc = await PDFDocument.load(await archivo.arrayBuffer(), {
          ignoreEncryption: true,
        });
        const paginas = doc.getPageCount();
        if (paginas > LIMITE_PAGINAS_PDF) {
          setErrorArchivo(
            `Este PDF tiene ${paginas} páginas; el límite es ${LIMITE_PAGINAS_PDF} para mantener la precisión del análisis.`,
          );
          return;
        }
      }
    }
    setErrorArchivo(null);

    let fileParts: FileUIPart[] | undefined;
    if (hayArchivos) {
      setSubiendo(true);
      try {
        fileParts = await Promise.all(
          Array.from(archivos!).map(async (file) => {
            const resultado = await upload(
              pathnameParaDocumento(documentId, file.name),
              file,
              {
                access: "private",
                handleUploadUrl: "/api/upload",
                clientPayload: JSON.stringify({ documentId }),
              },
            );
            return {
              type: "file",
              url: urlProxyDeArchivo(resultado.pathname),
              mediaType: resultado.contentType,
              filename: file.name,
            } satisfies FileUIPart;
          }),
        );
      } finally {
        setSubiendo(false);
      }
    }

    sendMessage({ text: input, files: fileParts });
    setInput("");
    setArchivos(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <WatchBackground className="flex h-full flex-col items-center">
      <main className="flex w-full max-w-3xl flex-1 flex-col overflow-y-auto px-4">
        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <p className="text-2xl font-medium text-foreground/80">
              ¿En qué puedo ayudarte hoy?
            </p>
            <p className="max-w-md text-sm text-foreground/50">
              Consultor de Procesos Administrativos en Condominio, basado en
              la Ley de Propiedad en Condominio de Yucatán.
            </p>
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
                    if (part.type === "file") {
                      const esImagen = part.mediaType.startsWith("image/");
                      return (
                        <div key={key} className="mb-2">
                          {esImagen ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={part.url}
                              alt={part.filename ?? "Imagen adjunta"}
                              className="max-h-48 rounded-lg border border-border"
                            />
                          ) : (
                            <a
                              href={part.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/50 px-2.5 py-1 text-xs text-foreground/70 hover:text-foreground"
                            >
                              📄 {part.filename ?? "Documento adjunto"}
                            </a>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
                {message.role === "assistant" && (
                  <button
                    type="button"
                    onClick={() => copiarMensaje(message)}
                    aria-label="Copiar respuesta"
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
                )}
              </div>
            ))}
            {status === "submitted" && (
              <div className="flex justify-start">
                <span className="text-sm text-foreground/40">
                  Leger está escribiendo…
                </span>
              </div>
            )}
          </div>
        )}
      </main>

      <div className="w-full max-w-3xl px-4 pb-6 pt-2">
        {(mensajeError || errorArchivo || limiteAlcanzado) && (
          <div className="mb-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-600">
            {mensajeError ??
              errorArchivo ??
              `Alcanzaste el límite de ${LIMITE_CONSULTAS_GRATIS} consultas gratis. La suscripción estará disponible pronto.`}
          </div>
        )}
        {!limiteAlcanzado && uso.plan === "free" && (
          <p className="mb-1.5 px-1 text-xs text-foreground/40">
            {consultasRestantes} de {LIMITE_CONSULTAS_GRATIS} consultas gratis restantes
            {!documentoYaAnalizado &&
              ` · ${documentosRestantes} de ${LIMITE_DOCUMENTOS_GRATIS} análisis de documento gratis`}
          </p>
        )}
        {hayArchivos && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {Array.from(archivos!).map((f, i) => (
              <span
                key={`${f.name}-${i}`}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2 py-1 text-xs text-foreground/70"
              >
                📎 {f.name}
              </span>
            ))}
          </div>
        )}
        <form
          onSubmit={handleSubmit}
          className="flex items-end gap-2 rounded-3xl border border-border bg-surface px-4 py-3 shadow-sm"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/*"
            onChange={(e) => {
              setArchivos(e.target.files);
              setErrorArchivo(null);
            }}
            disabled={isBusy || !puedeSubirDocumentos}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            aria-label={
              puedeSubirDocumentos
                ? `Adjuntar un acta del régimen (PDF, máx. ${LIMITE_PAGINAS_PDF} páginas, o imagen)`
                : "Ya usaste tu análisis de documento gratis: disponible de nuevo con suscripción"
            }
            title={
              puedeSubirDocumentos
                ? `Un archivo por análisis, máx. ${LIMITE_PAGINAS_PDF} páginas`
                : "Ya usaste tu análisis de documento gratis. La suscripción estará disponible pronto."
            }
            className={`flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-foreground/50 transition-colors hover:bg-background/50 hover:text-foreground/80 ${
              isBusy || !puedeSubirDocumentos ? "pointer-events-none opacity-40" : ""
            }`}
          >
            {puedeSubirDocumentos ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path
                  d="M21.44 11.05l-9.19 9.19a5 5 0 01-7.07-7.07l9.19-9.19a3.5 3.5 0 014.95 4.95l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <rect
                  x="5"
                  y="11"
                  width="14"
                  height="9"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M8 11V8a4 4 0 018 0v3"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </label>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isBusy || limiteAlcanzado}
            placeholder={
              limiteAlcanzado
                ? "Alcanzaste el límite de consultas gratis"
                : "Escribe tu mensaje a Leger…"
            }
            className="flex-1 bg-transparent text-[15px] text-foreground placeholder:text-foreground/40 outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={isBusy || limiteAlcanzado || (!input.trim() && !hayArchivos)}
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
        </form>
      </div>
    </WatchBackground>
  );
}
