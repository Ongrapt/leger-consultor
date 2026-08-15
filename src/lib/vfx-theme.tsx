"use client";

import { useCallback, useSyncExternalStore } from "react";

export type VfxStyle = "flat" | "vortex";
export type VfxColor = "coral" | "cyan";

type VfxState = { style: VfxStyle; color: VfxColor };

const STORAGE_KEY = "leger:vfx-theme";
const DEFAULT_STATE: VfxState = { style: "vortex", color: "coral" };

function leerDeLocalStorage(): VfxState {
  try {
    const guardado = localStorage.getItem(STORAGE_KEY);
    if (!guardado) return DEFAULT_STATE;
    const parsed = JSON.parse(guardado) as Partial<VfxState>;
    return {
      style: parsed.style === "flat" || parsed.style === "vortex" ? parsed.style : DEFAULT_STATE.style,
      color: parsed.color === "coral" || parsed.color === "cyan" ? parsed.color : DEFAULT_STATE.color,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

let estadoActual: VfxState =
  typeof window !== "undefined" ? leerDeLocalStorage() : DEFAULT_STATE;
const listeners = new Set<() => void>();

function actualizarEstado(parcial: Partial<VfxState>) {
  estadoActual = { ...estadoActual, ...parcial };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(estadoActual));
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): VfxState {
  return estadoActual;
}

function getServerSnapshot(): VfxState {
  return DEFAULT_STATE;
}

export function useVfxTheme() {
  const { style, color } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setStyle = useCallback((style: VfxStyle) => actualizarEstado({ style }), []);
  const setColor = useCallback((color: VfxColor) => actualizarEstado({ color }), []);

  return { style, color, setStyle, setColor };
}
