"use client";

import { useEffect, useRef, useState } from "react";
import { useVfxTheme } from "@/lib/vfx-theme";

export default function VfxThemeMenu() {
  const { style, color, setStyle, setColor } = useVfxTheme();
  const [abierto, setAbierto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    function handleClickFuera(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", handleClickFuera);
    return () => document.removeEventListener("mousedown", handleClickFuera);
  }, [abierto]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-label="Ajustes de apariencia"
        aria-expanded={abierto}
        className={`flex h-8 w-8 items-center justify-center rounded-lg text-foreground/60 transition-colors hover:bg-surface hover:text-foreground ${
          abierto ? "bg-surface text-foreground" : ""
        }`}
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
          <path
            d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {abierto && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-border bg-background p-3 shadow-lg">
          <p className="mb-2 text-xs font-medium text-foreground/50">Estilo de fondo</p>
          <div className="mb-3 flex gap-1 rounded-lg bg-surface p-1">
            <button
              type="button"
              onClick={() => setStyle("flat")}
              className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                style === "flat"
                  ? "bg-foreground text-background"
                  : "text-foreground/60 hover:text-foreground"
              }`}
            >
              Plano
            </button>
            <button
              type="button"
              onClick={() => setStyle("vortex")}
              className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                style === "vortex"
                  ? "bg-foreground text-background"
                  : "text-foreground/60 hover:text-foreground"
              }`}
            >
              Vórtice
            </button>
          </div>

          <p className="mb-2 text-xs font-medium text-foreground/50">Color de acento</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setColor("coral")}
              aria-label="Tema coral"
              className={`vfx-swatch coral h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${
                color === "coral" ? "border-foreground" : "border-transparent"
              }`}
            />
            <button
              type="button"
              onClick={() => setColor("cyan")}
              aria-label="Tema cian"
              className={`vfx-swatch cyan h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${
                color === "cyan" ? "border-foreground" : "border-transparent"
              }`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
