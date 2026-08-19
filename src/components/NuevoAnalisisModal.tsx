"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { crearDocumentoConId } from "@/lib/actions/documentos";
import { subirYRegistrarFuente } from "@/lib/use-fuente-uploader";

export default function NuevoAnalisisModal() {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function cerrar() {
    setAbierto(false);
    setTitulo("");
    setArchivo(null);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim() || isPending) return;

    setError(null);
    startTransition(async () => {
      const { id } = await crearDocumentoConId(titulo.trim());

      if (archivo) {
        const resultado = await subirYRegistrarFuente(id, archivo, 0);
        if (!resultado.ok) {
          // El documento ya existe; lo abrimos igual, la subida se puede
          // reintentar desde ahí.
          setError(resultado.error);
        }
      }

      router.push(`/documentos/${id}`);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex items-center justify-center gap-1.5 rounded-xl bg-foreground px-3 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
      >
        <span aria-hidden="true">+</span> Nuevo análisis
      </button>

      {abierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !isPending && cerrar()}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-background p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1 text-base font-medium text-foreground">Nuevo análisis</h2>
            <p className="mb-4 text-sm text-foreground/60">
              Dale un título, por ejemplo &ldquo;Reglamento&rdquo; o &ldquo;Acta de Asamblea
              Noviembre&rdquo;. Puedes adjuntar el documento ahora o hacerlo después.
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                autoFocus
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Reglamento, Acta de Asamblea…"
                disabled={isPending}
                className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 outline-none disabled:opacity-60"
              />

              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
                disabled={isPending}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isPending}
                className="flex items-center justify-center gap-1.5 self-start rounded-lg border border-dashed border-border px-2.5 py-1.5 text-xs text-foreground/60 transition-colors hover:bg-surface disabled:opacity-40"
              >
                <span aria-hidden="true">+</span>{" "}
                {archivo ? archivo.name : "Adjuntar archivo (opcional)"}
              </button>

              {error && (
                <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-600">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={cerrar}
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
