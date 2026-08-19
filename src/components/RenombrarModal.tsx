"use client";

import { useState, useTransition } from "react";
import { renombrarDocumento } from "@/lib/actions/documentos";

export default function RenombrarModal({
  documentId,
  tituloActual,
  onClose,
}: {
  documentId: string;
  tituloActual: string;
  onClose: () => void;
}) {
  const [titulo, setTitulo] = useState(tituloActual);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim() || isPending) return;
    startTransition(async () => {
      await renombrarDocumento(documentId, titulo.trim());
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => !isPending && onClose()}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-background p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-base font-medium text-foreground">Editar detalles</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            autoFocus
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Título"
            disabled={isPending}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 outline-none disabled:opacity-60"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
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
              {isPending ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
