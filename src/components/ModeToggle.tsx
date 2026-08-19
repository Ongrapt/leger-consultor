"use client";

import type { ChatMode } from "@/lib/types";

export default function ModeToggle({
  mode,
  onChange,
  analisisBloqueado,
}: {
  mode: ChatMode;
  onChange: (mode: ChatMode) => void;
  /** true cuando el documento ya tiene fuentes: es un análisis y no se puede "bajar" a chat suelto. */
  analisisBloqueado: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-border bg-surface p-0.5 text-xs">
      <button
        type="button"
        onClick={() => onChange("chat")}
        disabled={analisisBloqueado}
        aria-pressed={mode === "chat"}
        className={`rounded-full px-3 py-1 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
          mode === "chat"
            ? "bg-foreground text-background"
            : "text-foreground/60 hover:text-foreground"
        }`}
      >
        Chat
      </button>
      <button
        type="button"
        onClick={() => onChange("analisis")}
        aria-pressed={mode === "analisis"}
        className={`rounded-full px-3 py-1 font-medium transition-colors ${
          mode === "analisis"
            ? "bg-foreground text-background"
            : "text-foreground/60 hover:text-foreground"
        }`}
      >
        Análisis
      </button>
    </div>
  );
}
