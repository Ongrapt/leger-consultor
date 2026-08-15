"use client";

import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import NuevaConsultaButton from "@/components/NuevaConsultaButton";
import NuevoAnalisisModal from "@/components/NuevoAnalisisModal";
import VfxThemeMenu from "@/components/VfxThemeMenu";
import { eliminarDocumento } from "@/lib/actions/documentos";

type Documento = { id: string; title: string; updatedAt: Date };

export default function AppSidebar({
  documentos,
  estaAutenticado,
  children,
}: {
  documentos: Documento[];
  estaAutenticado: boolean;
  children: React.ReactNode;
}) {
  const [abierto, setAbierto] = useState(true);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const pathname = usePathname();
  const router = useRouter();

  function handleEliminar(doc: Documento) {
    const confirmado = window.confirm(
      `¿Eliminar "${doc.title}"? Se perderá toda la conversación.`,
    );
    if (!confirmado) return;

    setPendingDeleteId(doc.id);
    startTransition(async () => {
      await eliminarDocumento(doc.id);
      if (pathname === `/documentos/${doc.id}`) {
        router.push("/");
      }
      setPendingDeleteId(null);
    });
  }

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
          {estaAutenticado ? (
            <UserButton />
          ) : (
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
          <div className="flex w-72 shrink-0 flex-col gap-3">
            {estaAutenticado ? (
              <div className="flex flex-col gap-2">
                <NuevoAnalisisModal />
                <NuevaConsultaButton />
              </div>
            ) : (
              <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
                <p className="text-xs text-foreground/60">
                  Crea una cuenta gratis para empezar: incluye 3 consultas sin
                  costo.
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

            <div className="flex-1 overflow-y-auto">
              {documentos.length === 0 ? (
                <p className="px-2 py-4 text-sm text-foreground/40">
                  Aún no hay documentos en análisis.
                </p>
              ) : (
                <ul className="flex flex-col gap-0.5">
                  {documentos.map((doc) => {
                    const href = `/documentos/${doc.id}`;
                    const activo = pathname === href;
                    return (
                      <li key={doc.id} className="flex items-center gap-1">
                        <Link
                          href={href}
                          onClick={() => setAbierto(false)}
                          className={`block flex-1 truncate rounded-lg px-2.5 py-2 text-sm transition-colors ${
                            activo
                              ? "bg-surface text-foreground"
                              : "text-foreground/70 hover:bg-surface hover:text-foreground"
                          }`}
                        >
                          {doc.title}
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleEliminar(doc)}
                          disabled={pendingDeleteId === doc.id}
                          aria-label={`Eliminar ${doc.title}`}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-foreground/30 transition-colors hover:bg-surface hover:text-red-500 disabled:opacity-40"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          >
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
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
