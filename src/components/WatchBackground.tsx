"use client";

import { useState } from "react";

type WatchTheme = "coral" | "cyan";
type WatchStyle = "flat" | "vortex";

export default function WatchBackground({
  children,
  className = "",
  defaultTheme = "coral",
  defaultStyle = "vortex",
}: {
  children: React.ReactNode;
  className?: string;
  defaultTheme?: WatchTheme;
  defaultStyle?: WatchStyle;
}) {
  const [theme, setTheme] = useState<WatchTheme>(defaultTheme);
  const [style, setStyle] = useState<WatchStyle>(defaultStyle);

  return (
    <div className={`ui-vfx-watch-bg ${theme} ${style} ${className}`}>
      <div className="vfx-content-scrim" />
      <div className="vfx-theme-controls">
        <div className="vfx-style-toggle">
          <button
            type="button"
            onClick={() => setStyle("flat")}
            className={style === "flat" ? "active" : ""}
          >
            Plano
          </button>
          <button
            type="button"
            onClick={() => setStyle("vortex")}
            className={style === "vortex" ? "active" : ""}
          >
            Vórtice
          </button>
        </div>
        <div className="vfx-color-toggle">
          <button
            type="button"
            aria-label="Tema coral"
            onClick={() => setTheme("coral")}
            className={`theme-btn coral-theme ${theme === "coral" ? "active" : ""}`}
          />
          <button
            type="button"
            aria-label="Tema cian"
            onClick={() => setTheme("cyan")}
            className={`theme-btn cyan-theme ${theme === "cyan" ? "active" : ""}`}
          />
        </div>
      </div>
      {children}
    </div>
  );
}
