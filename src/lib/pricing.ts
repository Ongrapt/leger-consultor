// Precios de Claude Sonnet 5 (USD por millón de tokens). Promoción de
// lanzamiento vigente hasta 2026-08-31; después el input pasa de $2 a $3 y
// el output de $10 a $15 — hay que actualizar estas dos constantes ese día.
const INPUT_POR_MTOK = 2.0;
const OUTPUT_POR_MTOK = 10.0;

// Multiplicadores estándar de Anthropic para prompt caching, aplicados
// sobre el precio de input: lectura de caché 0.1x, escritura con TTL de 1h
// 2x (ver providerOptions.anthropic.cacheControl en api/chat/route.ts).
const CACHE_LECTURA_POR_MTOK = INPUT_POR_MTOK * 0.1;
const CACHE_ESCRITURA_1H_POR_MTOK = INPUT_POR_MTOK * 2;

export type UsoTokens = {
  sinCache: number;
  lecturaCache: number;
  escrituraCache: number;
  salida: number;
};

export function calcularCostoUsd(uso: UsoTokens): number {
  return (
    (uso.sinCache / 1_000_000) * INPUT_POR_MTOK +
    (uso.lecturaCache / 1_000_000) * CACHE_LECTURA_POR_MTOK +
    (uso.escrituraCache / 1_000_000) * CACHE_ESCRITURA_1H_POR_MTOK +
    (uso.salida / 1_000_000) * OUTPUT_POR_MTOK
  );
}
