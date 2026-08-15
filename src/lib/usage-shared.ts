export const LIMITE_CONSULTAS_GRATIS = 3;

// Máximo de páginas por PDF adjunto: por encima de esto el modelo pierde
// precisión al analizar el documento completo.
export const LIMITE_PAGINAS_PDF = 20;

// Durante la etapa de prueba/lanzamiento la subida de documentos está abierta
// para cualquier usuario registrado, sin exigir suscripción. Cuando se active
// el cobro, cambiar a `true` para volver a requerir plan "subscription".
export const SUBIDA_REQUIERE_SUSCRIPCION = false;

export type Uso = {
  plan: "free" | "subscription";
  consultasUsadas: number;
};

export function puedeSubirDocumentos(uso: Uso): boolean {
  if (!SUBIDA_REQUIERE_SUSCRIPCION) return true;
  return uso.plan === "subscription";
}
