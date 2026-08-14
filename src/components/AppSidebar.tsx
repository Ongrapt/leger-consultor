"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import NuevoAnalisisModal from "@/components/NuevoAnalisisModal";

type Documento = { id: string; title: string; updatedAt: Date };

export default function AppSidebar({
  documentos,
  children,
}: {
  documentos: Documento[];
  children: React.ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);
  const pathname = usePathname();

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
        <UserButton />
      </header>

      <div className="relative flex flex-1 overflow-hidden">
        {abierto && (
          <div
            className="fixed inset-0 z-30 bg-black/30 md:hidden"
            onClick={() => setAbierto(false)}
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col gap-3 border-r border-border bg-background p-3 transition-transform md:static md:z-auto md:translate-x-0 ${
            abierto ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <NuevoAnalisisModal />

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
                    <li key={doc.id}>
                      <Link
                        href={href}
                        onClick={() => setAbierto(false)}
                        className={`block truncate rounded-lg px-2.5 py-2 text-sm transition-colors ${
                          activo
                            ? "bg-surface text-foreground"
                            : "text-foreground/70 hover:bg-surface hover:text-foreground"
                        }`}
                      >
                        {doc.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        <div className="min-w-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
