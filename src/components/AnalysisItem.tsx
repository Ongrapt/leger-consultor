"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import ItemMenu from "@/components/ItemMenu";
import RenombrarModal from "@/components/RenombrarModal";
import { crearChat, eliminarChat } from "@/lib/actions/chats";
import { archivarDocumento, eliminarDocumento } from "@/lib/actions/documentos";
import { ETIQUETA_TIPO, inferirTipoAnalisis } from "@/lib/analysis-type";

type Fuente = { id: string; nombreArchivo: string; paginas: number | null };
type Chat = { id: string; documentId: string; title: string };

export default function AnalysisItem({
  documento,
  chats,
  esActivo,
  onNavegar,
}: {
  documento: { id: string; title: string; fuentes: Fuente[] };
  chats: Chat[];
  esActivo: boolean;
  onNavegar: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const href = `/documentos/${documento.id}`;
  const chatActivoId = esActivo ? searchParams.get("chat") : null;
  const tipo = inferirTipoAnalisis(documento.title);

  const [expandido, setExpandido] = useState(esActivo);
  const [renombrando, setRenombrando] = useState(false);
  const [, startTransition] = useTransition();

  function handleEliminarDocumento() {
    const confirmado = window.confirm(
      `¿Eliminar "${documento.title}"? Se perderá toda su conversación y fuentes.`,
    );
    if (!confirmado) return;

    startTransition(async () => {
      await eliminarDocumento(documento.id);
      if (esActivo) router.push("/");
    });
  }

  function handleArchivarDocumento() {
    startTransition(async () => {
      await archivarDocumento(documento.id);
      if (esActivo) router.push("/");
    });
  }

  function handleEliminarChat(chat: Chat) {
    if (chats.length <= 1) return;
    const confirmado = window.confirm(`¿Eliminar la conversación "${chat.title}"?`);
    if (!confirmado) return;

    startTransition(async () => {
      await eliminarChat(chat.id);
      if (chat.id === chatActivoId) {
        const siguiente = chats.find((c) => c.id !== chat.id);
        router.push(siguiente ? `${href}?chat=${siguiente.id}` : href);
      }
    });
  }

  function handleNuevoChat() {
    startTransition(async () => {
      await crearChat(documento.id, `Conversación ${chats.length + 1}`);
    });
  }

  return (
    <li className="flex flex-col">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setExpandido((v) => !v)}
          aria-label={expandido ? "Colapsar" : "Expandir"}
          className="flex h-7 w-5 shrink-0 items-center justify-center text-foreground/30 hover:text-foreground/60"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className={`h-3 w-3 transition-transform ${expandido ? "rotate-90" : ""}`}
            aria-hidden="true"
          >
            <path
              d="M9 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <Link
          href={href}
          onClick={onNavegar}
          className={`flex flex-1 items-center gap-1.5 truncate rounded-lg px-1.5 py-2 text-sm transition-colors ${
            esActivo && !chatActivoId
              ? "bg-surface text-foreground"
              : "text-foreground/70 hover:bg-surface hover:text-foreground"
          }`}
        >
          <span className="truncate">{documento.title}</span>
          {tipo && (
            <span className="shrink-0 rounded-full border border-border px-1.5 py-0.5 text-[10px] font-medium text-foreground/40">
              {ETIQUETA_TIPO[tipo]}
            </span>
          )}
        </Link>
        <ItemMenu
          onRename={() => setRenombrando(true)}
          onArchive={handleArchivarDocumento}
          onDelete={handleEliminarDocumento}
        />
      </div>

      {renombrando && (
        <RenombrarModal
          documentId={documento.id}
          tituloActual={documento.title}
          onClose={() => setRenombrando(false)}
        />
      )}

      {expandido && (
        <div className="ml-5 flex flex-col gap-2 border-l border-border py-1 pl-2">
          <div className="flex flex-col gap-0.5">
            <p className="px-2 text-[10px] font-medium uppercase tracking-wide text-foreground/30">
              Chats vinculados
            </p>
            <ul className="flex flex-col gap-0.5">
              {chats.map((chat) => {
                const activo = esActivo && chatActivoId === chat.id;
                return (
                  <li key={chat.id} className="flex items-center gap-1">
                    <Link
                      href={`${href}?chat=${chat.id}`}
                      onClick={onNavegar}
                      className={`block flex-1 truncate rounded-lg px-2 py-1.5 text-xs transition-colors ${
                        activo
                          ? "bg-surface text-foreground"
                          : "text-foreground/50 hover:bg-surface hover:text-foreground"
                      }`}
                    >
                      {chat.title}
                    </Link>
                    {chats.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleEliminarChat(chat)}
                        aria-label={`Eliminar ${chat.title}`}
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-foreground/30 transition-colors hover:bg-surface hover:text-red-500"
                      >
                        ×
                      </button>
                    )}
                  </li>
                );
              })}
              <li>
                <button
                  type="button"
                  onClick={handleNuevoChat}
                  className="flex w-full items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-foreground/40 transition-colors hover:bg-surface hover:text-foreground"
                >
                  <span aria-hidden="true">+</span> Nuevo chat
                </button>
              </li>
            </ul>
          </div>
        </div>
      )}
    </li>
  );
}
