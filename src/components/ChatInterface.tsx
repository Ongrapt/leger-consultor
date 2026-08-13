"use client";

import { useChat } from "@ai-sdk/react";
import { useRef, useState } from "react";
import { Streamdown } from "streamdown";
import "streamdown/styles.css";
import WatchBackground from "@/components/WatchBackground";

export default function ChatInterface() {
  const { messages, sendMessage, status } = useChat();
  const [input, setInput] = useState("");
  const [archivos, setArchivos] = useState<FileList | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isBusy = status === "submitted" || status === "streaming";
  const hayArchivos = !!archivos && archivos.length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if ((!input.trim() && !hayArchivos) || isBusy) return;
    sendMessage({ text: input, files: archivos ?? undefined });
    setInput("");
    setArchivos(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <WatchBackground className="flex h-dvh flex-col items-center">
      <header className="w-full max-w-3xl px-4 pt-6 pb-2 text-center">
        <h1 className="text-lg font-medium text-foreground/90">Leger</h1>
      </header>

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
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
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
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/50 px-2.5 py-1 text-xs text-foreground/70">
                              📄 {part.filename ?? "Documento adjunto"}
                            </span>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
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
            multiple
            onChange={(e) => setArchivos(e.target.files)}
            disabled={isBusy}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            aria-label="Adjuntar acta, convocatoria o reglamento (PDF o imagen)"
            className={`flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-foreground/50 transition-colors hover:bg-background/50 hover:text-foreground/80 ${
              isBusy ? "pointer-events-none opacity-40" : ""
            }`}
          >
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
          </label>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isBusy}
            placeholder="Escribe tu mensaje a Leger…"
            className="flex-1 bg-transparent text-[15px] text-foreground placeholder:text-foreground/40 outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={isBusy || (!input.trim() && !hayArchivos)}
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
