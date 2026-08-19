"use client";

import { useState, useTransition } from "react";
import ModeToggle from "@/components/ModeToggle";
import { crearDocumento } from "@/lib/actions/documentos";
import { guardarMensajeInicial } from "@/lib/pending-message";
import type { ChatMode } from "@/lib/types";
import { LIMITE_CONSULTAS_GRATIS, type Uso } from "@/lib/usage-shared";

export default function InicioComposer({ uso }: { uso: Uso }) {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<ChatMode>("chat");
  const [isPending, startTransition] = useTransition();

  const consultasRestantes = Math.max(0, LIMITE_CONSULTAS_GRATIS - uso.consultasUsadas);
  const limiteAlcanzado = uso.plan === "free" && consultasRestantes <= 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const texto = input.trim();
    if (!texto || isPending || limiteAlcanzado) return;

    guardarMensajeInicial({ texto, modo: mode });
    startTransition(async () => {
      await crearDocumento(texto.slice(0, 60));
    });
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-2">
      {limiteAlcanzado && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-600">
          Alcanzaste el límite de {LIMITE_CONSULTAS_GRATIS} consultas gratis. La suscripción
          estará disponible pronto.
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-2 rounded-3xl border border-border bg-surface px-4 py-3 shadow-sm"
      >
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isPending || limiteAlcanzado}
          placeholder={
            mode === "chat"
              ? "Escribe tu mensaje a Leger…"
              : "Describe qué quieres analizar…"
          }
          className="w-full bg-transparent text-[15px] text-foreground placeholder:text-foreground/40 outline-none disabled:opacity-60"
        />
        <div className="flex items-center justify-between gap-2">
          <ModeToggle mode={mode} onChange={setMode} analisisBloqueado={false} />
          <div className="flex items-center gap-2">
            {uso.plan === "free" && (
              <span className="text-xs text-foreground/40">
                {consultasRestantes} / {LIMITE_CONSULTAS_GRATIS} gratis
              </span>
            )}
            <button
              type="submit"
              disabled={isPending || limiteAlcanzado || !input.trim()}
              aria-label="Enviar"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-opacity disabled:opacity-30"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
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
  );
}
