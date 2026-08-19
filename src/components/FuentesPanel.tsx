"use client";

import { useRef, useState, useTransition } from "react";
import { eliminarFuente } from "@/lib/actions/fuentes";
import { LIMITE_PAGINAS_ANALISIS } from "@/lib/usage-shared";
import { useFuenteUploader } from "@/lib/use-fuente-uploader";

type Fuente = {
  id: string;
  nombreArchivo: string;
  paginas: number | null;
};

export default function FuentesPanel({
  documentId,
  fuentes,
  puedeAgregar,
  onSubido,
}: {
  documentId: string;
  fuentes: Fuente[];
  puedeAgregar: boolean;
  onSubido?: () => void;
}) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const paginasUsadas = fuentes.reduce((acc, f) => acc + (f.paginas ?? 0), 0);
  const { subirArchivo, subiendo, error, setError, espacioLibre } = useFuenteUploader(
    documentId,
    paginasUsadas,
  );

  function handleEliminar(fuente: Fuente) {
    const confirmado = window.confirm(`¿Eliminar "${fuente.nombreArchivo}" de este análisis?`);
    if (!confirmado) return;

    setPendingDeleteId(fuente.id);
    startTransition(async () => {
      try {
        await eliminarFuente(fuente.id);
      } catch (err) {
        console.error("[fuentes] Error al eliminar fuente:", err);
        setError(err instanceof Error ? err.message : "Error al eliminar el archivo");
      } finally {
        setPendingDeleteId(null);
      }
    });
  }

  return (
    <div className="flex w-full flex-col gap-1.5">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xs font-medium uppercase tracking-wide text-foreground/40">
          Fuentes
        </h2>
        <span className="text-[11px] text-foreground/40">
          {paginasUsadas}/{LIMITE_PAGINAS_ANALISIS}p
        </span>
      </div>

      {fuentes.length > 0 && (
        <ul className="flex flex-col gap-1">
          {fuentes.map((fuente) => (
            <li
              key={fuente.id}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs"
            >
              <span className="flex-1 truncate text-foreground/80" title={fuente.nombreArchivo}>
                📄 {fuente.nombreArchivo}
              </span>
              {fuente.paginas !== null && (
                <span className="shrink-0 text-[11px] text-foreground/40">
                  {fuente.paginas}p
                </span>
              )}
              <button
                type="button"
                onClick={() => handleEliminar(fuente)}
                disabled={pendingDeleteId === fuente.id}
                aria-label={`Eliminar ${fuente.nombreArchivo}`}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-foreground/30 transition-colors hover:bg-background/50 hover:text-red-500 disabled:opacity-40"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" aria-hidden="true">
                  <path
                    d="M4 7h16M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m2 0v13a1 1 0 01-1 1H8a1 1 0 01-1-1V7h10zM10 11v6M14 11v6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-600">
          {error}
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          const ok = await subirArchivo(file);
          if (ok) onSubido?.();
        }}
        disabled={subiendo || !puedeAgregar || espacioLibre <= 0}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={subiendo || !puedeAgregar || espacioLibre <= 0}
        title={
          !puedeAgregar
            ? "Ya usaste tu archivo gratis. La suscripción estará disponible pronto."
            : espacioLibre <= 0
              ? "Este análisis alcanzó el límite de páginas."
              : undefined
        }
        className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-2.5 py-1.5 text-xs text-foreground/60 transition-colors hover:bg-surface disabled:opacity-40"
      >
        <span aria-hidden="true">+</span> {subiendo ? "Subiendo…" : "Agregar archivo"}
      </button>
    </div>
  );
}
