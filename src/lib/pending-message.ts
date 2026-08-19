"use client";

import type { ChatMode } from "@/lib/types";

const KEY = "leger:mensaje-inicial";

export type MensajeInicial = { texto: string; modo: ChatMode };

// Puente puramente de UI entre el composer de inicio y el chat recién
// creado: el mensaje se escribe antes de redirigir (crearDocumento hace un
// redirect del lado del servidor, así que no hay forma de pasarlo como
// prop) y se consume una sola vez al montar el chat destino.
export function guardarMensajeInicial(mensaje: MensajeInicial) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(mensaje));
  } catch {
    // sessionStorage no disponible: el chat se crea igual, solo sin autoenvío.
  }
}

export function tomarMensajeInicial(): MensajeInicial | null {
  try {
    const crudo = sessionStorage.getItem(KEY);
    if (!crudo) return null;
    sessionStorage.removeItem(KEY);
    return JSON.parse(crudo) as MensajeInicial;
  } catch {
    return null;
  }
}
