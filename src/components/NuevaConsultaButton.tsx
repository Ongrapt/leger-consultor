"use client";

import { useTransition } from "react";
import { crearDocumento } from "@/lib/actions/documentos";

export default function NuevaConsultaButton({
  className,
}: {
  className?: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (isPending) return;
    startTransition(async () => {
      await crearDocumento("Nueva consulta");
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={`flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface disabled:opacity-60 ${className ?? ""}`}
    >
      <span aria-hidden="true">+</span>{" "}
      {isPending ? "Abriendo…" : "Nueva consulta"}
    </button>
  );
}
