export const LIMITE_CONSULTAS_GRATIS = 2;

// En modo gratis solo se puede subir un archivo, de por vida (sin importar
// en cuántos análisis). Con suscripción no aplica: solo rigen los topes de
// páginas por archivo y por análisis, iguales para todos.
export const LIMITE_DOCUMENTOS_GRATIS = 1;

// Máximo de páginas por archivo fuente: por encima de esto el modelo pierde
// precisión al analizar el documento completo.
export const LIMITE_PAGINAS_PDF = 20;

// Máximo de páginas sumando todos los archivos fuente de un mismo análisis.
export const LIMITE_PAGINAS_ANALISIS = 100;

export type Uso = {
  plan: "free" | "subscription";
  consultasUsadas: number;
  documentosAnalizados: number;
};

export function puedeSubirDocumentos(uso: Uso): boolean {
  return uso.plan === "subscription" || uso.documentosAnalizados < LIMITE_DOCUMENTOS_GRATIS;
}
