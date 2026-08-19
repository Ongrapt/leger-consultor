"use client";

import { useEffect, useRef, useState } from "react";

export default function ItemMenu({
  onRename,
  onArchive,
  onDelete,
}: {
  onRename: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;

    function handlePointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [abierto]);

  function accion(fn: () => void) {
    setAbierto(false);
    fn();
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setAbierto((v) => !v);
        }}
        aria-label="Más opciones"
        aria-expanded={abierto}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-foreground/30 transition-colors hover:bg-surface hover:text-foreground"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>

      {abierto && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-xl border border-border bg-background py-1 shadow-lg"
        >
          <button
            type="button"
            onClick={() => accion(onRename)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-foreground/80 hover:bg-surface"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
              <path
                d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Editar detalles
          </button>
          <button
            type="button"
            onClick={() => accion(onArchive)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-foreground/80 hover:bg-surface"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
              <path
                d="M4 7h16M5 7v12a1 1 0 001 1h12a1 1 0 001-1V7M9 11h6M3 4h18v3H3V4z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Archivar
          </button>
          <button
            type="button"
            onClick={() => accion(onDelete)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-500 hover:bg-surface"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
              <path
                d="M4 7h16M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m2 0v13a1 1 0 01-1 1H8a1 1 0 01-1-1V7h10zM10 11v6M14 11v6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Eliminar
          </button>
        </div>
      )}
    </div>
  );
}
