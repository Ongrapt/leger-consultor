import type { AnalysisType } from "@/lib/types";

const PALABRAS_CLAVE: Record<AnalysisType, RegExp> = {
  acta: /\bacta(s)?\b/i,
  convocatoria: /\bconvocatoria(s)?\b/i,
  reglamento: /\breglamento(s)?\b/i,
  comunicado: /\bcomunicado(s)?\b/i,
};

/** Etiqueta puramente visual: no se guarda, se infiere del título en cada render. */
export function inferirTipoAnalisis(titulo: string): AnalysisType | undefined {
  for (const [tipo, patron] of Object.entries(PALABRAS_CLAVE) as [AnalysisType, RegExp][]) {
    if (patron.test(titulo)) return tipo;
  }
  return undefined;
}

export const ETIQUETA_TIPO: Record<AnalysisType, string> = {
  acta: "Acta",
  convocatoria: "Convocatoria",
  reglamento: "Reglamento",
  comunicado: "Comunicado",
};
