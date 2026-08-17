export const LIMITE_CONSULTAS_GRATIS = 10;

// En modo gratis solo se puede analizar un documento; documentos adicionales
// requieren suscripción. Adjuntar más archivos al mismo documento ya
// analizado no cuenta contra este límite.
export const LIMITE_DOCUMENTOS_GRATIS = 1;

// Máximo de páginas por PDF adjunto: por encima de esto el modelo pierde
// precisión al analizar el documento completo.
export const LIMITE_PAGINAS_PDF = 20;

export type Uso = {
  plan: "free" | "subscription";
  consultasUsadas: number;
  documentosAnalizados: number;
};

export function puedeSubirDocumentos(uso: Uso, documentoYaAnalizado: boolean): boolean {
  if (uso.plan === "subscription") return true;
  if (documentoYaAnalizado) return true;
  return uso.documentosAnalizados < LIMITE_DOCUMENTOS_GRATIS;
}
