"use client";

import { useVfxTheme } from "@/lib/vfx-theme";

export default function WatchBackground({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { style, color } = useVfxTheme();

  return (
    <div className={`ui-vfx-watch-bg ${color} ${style} ${className}`}>
      <div className="vfx-content-scrim" />
      {children}
    </div>
  );
}
