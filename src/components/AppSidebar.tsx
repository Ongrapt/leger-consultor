"use client";

import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import AnalysisItem from "@/components/AnalysisItem";
import ItemMenu from "@/components/ItemMenu";
import NuevoAnalisisModal from "@/components/NuevoAnalisisModal";
import RenombrarModal from "@/components/RenombrarModal";
import VfxThemeMenu from "@/components/VfxThemeMenu";
import { crearChat, eliminarChat } from "@/lib/actions/chats";
import { archivarDocumento, desarchivarDocumento, eliminarDocumento } from "@/lib/actions/documentos";
import { LIMITE_CONSULTAS_GRATIS } from "@/lib/usage-shared";

type Fuente = { id: string; nombreArchivo: string; paginas: number | null };
type Documento = { id: string; title: string; updatedAt: Date; fuentes: Fuente[] };
type DocumentoArchivado = { id: string; title: string; updatedAt: Date };
type Chat = { id: string; documentId: string; title: string };

export default function AppSidebar({
  documentos,
  chats,
  archivados,
  estaAutenticado,
  children,
}: {
  documentos: Documento[];
  chats: Chat[];
  archivados: DocumentoArchivado[];
  estaAutenticado: boolean;
  children: React.ReactNode;
}) {
  const [abierto, setAbierto] = useState(true);
  const pathname = usePathname();

  // Un documento se comporta como Análisis en cuanto tiene al menos una
  // fuente; si no, es un chat suelto (ver comentario en db/schema.ts).
  const analisis = documentos.filter((d) => d.fuentes.length > 0);
  const chatsSueltos = documentos.filter((d) => d.fuentes.length === 0);

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            aria-label="Abrir menú"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground/70 hover:bg-surface"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
              <path
                d="M4 6h16M4 12h16M4 18h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <span className="text-sm font-medium text-foreground/90">Leger</span>
        </div>
        <div className="flex items-center gap-1">
          <VfxThemeMenu />
          {!estaAutenticado && (
            <SignInButton mode="redirect">
              <button
                type="button"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-foreground/70 hover:bg-surface hover:text-foreground"
              >
                Iniciar sesión
              </button>
            </SignInButton>
          )}
        </div>
      </header>

      <div className="relative flex flex-1 overflow-hidden">
        {abierto && (
          <div
            className="fixed inset-0 z-30 bg-black/30 md:hidden"
            onClick={() => setAbierto(false)}
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col gap-3 overflow-hidden border-r border-border bg-background p-3 transition-all duration-200 md:static md:z-auto ${
            abierto
              ? "translate-x-0 md:w-72"
              : "-translate-x-full md:w-0 md:translate-x-0 md:border-r-0 md:p-0"
          }`}
        >
          <div className="flex h-full w-72 shrink-0 flex-col gap-3 overflow-hidden">
            {!estaAutenticado && (
              <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
                <p className="text-xs text-foreground/60">
                  Crea una cuenta gratis para empezar: incluye{" "}
                  {LIMITE_CONSULTAS_GRATIS} consultas sin costo.
                </p>
                <SignUpButton mode="redirect">
                  <button
                    type="button"
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-foreground px-3 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
                  >
                    Crear cuenta gratis
                  </button>
                </SignUpButton>
              </div>
            )}

            {estaAutenticado && (
              <>
                <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
                  <NuevoAnalisisModal />

                  {analisis.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <p className="px-2 text-[11px] font-medium uppercase tracking-wide text-foreground/40">
                        Análisis
                      </p>
                      <ul className="flex flex-col gap-0.5">
                        {analisis.map((doc) => (
                          <AnalysisItem
                            key={doc.id}
                            documento={doc}
                            chats={chats.filter((c) => c.documentId === doc.id)}
                            esActivo={pathname === `/documentos/${doc.id}`}
                            onNavegar={() => setAbierto(false)}
                          />
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    <p className="px-2 text-[11px] font-medium uppercase tracking-wide text-foreground/40">
                      Consultas y Chats
                    </p>
                    {chatsSueltos.length === 0 ? (
                      <p className="px-2 py-1 text-xs text-foreground/40">Aún no hay chats.</p>
                    ) : (
                      <ul className="flex flex-col gap-0.5">
                        {chatsSueltos.map((doc) => (
                          <ChatSueltoItem
                            key={doc.id}
                            documento={doc}
                            chats={chats.filter((c) => c.documentId === doc.id)}
                            pathname={pathname}
                            onNavegar={() => setAbierto(false)}
                          />
                        ))}
                      </ul>
                    )}
                  </div>

                  {archivados.length > 0 && <ArchivadosSection archivados={archivados} />}
                </div>

                <div className="flex shrink-0 items-center gap-2 border-t border-border pt-3">
                  <UserButton />
                  <span className="text-xs text-foreground/50">Perfil y ajustes</span>
                </div>
              </>
            )}
          </div>
        </aside>

        <div className="min-w-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

function ChatSueltoItem({
  documento,
  chats,
  pathname,
  onNavegar,
}: {
  documento: Documento;
  chats: Chat[];
  pathname: string;
  onNavegar: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const href = `/documentos/${documento.id}`;
  const esActivo = pathname === href;
  const chatActivoId = esActivo ? searchParams.get("chat") : null;

  const [expandido, setExpandido] = useState(esActivo && chats.length > 1);
  const [renombrando, setRenombrando] = useState(false);
  const [, startTransition] = useTransition();

  function handleEliminarDocumento() {
    const confirmado = window.confirm(
      `¿Eliminar "${documento.title}"? Se perderá toda su conversación.`,
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

  if (chats.length <= 1) {
    return (
      <li className="flex items-center gap-1">
        <Link
          href={href}
          onClick={onNavegar}
          className={`block flex-1 truncate rounded-lg px-2 py-2 text-sm transition-colors ${
            esActivo
              ? "bg-surface text-foreground"
              : "text-foreground/70 hover:bg-surface hover:text-foreground"
          }`}
        >
          {documento.title}
        </Link>
        <ItemMenu
          onRename={() => setRenombrando(true)}
          onArchive={handleArchivarDocumento}
          onDelete={handleEliminarDocumento}
        />
        {renombrando && (
          <RenombrarModal
            documentId={documento.id}
            tituloActual={documento.title}
            onClose={() => setRenombrando(false)}
          />
        )}
      </li>
    );
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
          className={`block flex-1 truncate rounded-lg px-1.5 py-2 text-sm transition-colors ${
            esActivo && !chatActivoId
              ? "bg-surface text-foreground"
              : "text-foreground/70 hover:bg-surface hover:text-foreground"
          }`}
        >
          {documento.title}
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
        <ul className="ml-5 flex flex-col gap-0.5 border-l border-border pl-2">
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
                <button
                  type="button"
                  onClick={() => handleEliminarChat(chat)}
                  aria-label={`Eliminar ${chat.title}`}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-foreground/30 transition-colors hover:bg-surface hover:text-red-500"
                >
                  ×
                </button>
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
      )}
    </li>
  );
}

function ArchivadosSection({ archivados }: { archivados: DocumentoArchivado[] }) {
  const [expandido, setExpandido] = useState(false);
  const [, startTransition] = useTransition();

  function handleRestaurar(id: string) {
    startTransition(async () => {
      await desarchivarDocumento(id);
    });
  }

  function handleEliminar(doc: DocumentoArchivado) {
    const confirmado = window.confirm(`¿Eliminar "${doc.title}" permanentemente?`);
    if (!confirmado) return;
    startTransition(async () => {
      await eliminarDocumento(doc.id);
    });
  }

  return (
    <div className="flex flex-col gap-1 border-t border-border pt-3">
      <button
        type="button"
        onClick={() => setExpandido((v) => !v)}
        className="flex items-center gap-1 px-2 text-[11px] font-medium uppercase tracking-wide text-foreground/40 hover:text-foreground/60"
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
        Archivados
      </button>
      {expandido && (
        <ul className="flex flex-col gap-0.5">
          {archivados.map((doc) => (
            <li key={doc.id} className="flex items-center gap-1">
              <span className="block flex-1 truncate rounded-lg px-2 py-1.5 text-xs text-foreground/50">
                {doc.title}
              </span>
              <button
                type="button"
                onClick={() => handleRestaurar(doc.id)}
                className="shrink-0 rounded-lg px-1.5 py-1 text-[11px] text-foreground/40 transition-colors hover:bg-surface hover:text-foreground"
              >
                Restaurar
              </button>
              <button
                type="button"
                onClick={() => handleEliminar(doc)}
                aria-label={`Eliminar ${doc.title}`}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-foreground/30 transition-colors hover:bg-surface hover:text-red-500"
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
    </div>
  );
}
