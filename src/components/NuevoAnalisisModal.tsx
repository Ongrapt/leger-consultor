"use client";

import { useState, useTransition } from "react";
import { crearDocumento } from "@/lib/actions/documentos";

export default function NuevoAnalisisModal({
  className,
}: {
  className?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim() || isPending) return;
    startTransition(async () => {
      await crearDocumento(titulo.trim());
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className={`flex items-center justify-center gap-1.5 rounded-xl bg-foreground px-3 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 ${className ?? ""}`}
      >
        <span aria-hidden="true">+</span> Nuevo análisis
      </button>

      {abierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !isPending && setAbierto(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-background p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1 text-base font-medium text-foreground">
              Nuevo documento en análisis
            </h2>
            <p className="mb-4 text-sm text-foreground/60">
              Dale un título a este análisis, por ejemplo &ldquo;Acta del
              Régimen&rdquo;.
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                autoFocus
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Acta del Régimen"
                disabled={isPending}
                className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 outline-none disabled:opacity-60"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAbierto(false)}
                  disabled={isPending}
                  className="rounded-xl px-3 py-2 text-sm text-foreground/60 hover:text-foreground disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!titulo.trim() || isPending}
                  className="rounded-xl bg-foreground px-3 py-2 text-sm font-medium text-background transition-opacity disabled:opacity-40"
                >
                  {isPending ? "Creando…" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
