import type { UIMessage } from "ai";
import data from "../../../patrones_riesgo.json";

interface Patron {
  id: string;
  nombre: string;
  pregunta_de_verificacion: string;
  que_cumpliria_la_gobernanza?: string;
  resultado_si_cumple: string;
  via: string;
}

interface CatalogoPatrones {
  version: string;
  principio_rector: string;
  modo_auditoria: {
    pregunta_de_entrada: string;
    estandar: string;
    regla_de_transparencia: string;
  };
  reglas_de_honestidad: string[];
  patrones: Patron[];
  documentos_auditables: {
    descripcion: string;
    jerarquia_documental_interna: string;
    no_auditables: string;
  };
}

const CATALOGO = data as CatalogoPatrones;

/**
 * El propio catálogo exige que la activación del modo auditoría viva en
 * código (no sólo en el prompt): si hay un adjunto en la conversación, se
 * ofrece la auditoría; el consentimiento explícito del usuario lo decide el modelo.
 */
export function hayAdjuntoEnMensajes(messages: UIMessage[]): boolean {
  return messages.some((m) => m.parts.some((p) => p.type === "file"));
}

export function formatearBloquePatrones(): string {
  const patrones = CATALOGO.patrones
    .map(
      (p) =>
        `[${p.id} — ${p.nombre}]\nPregunta de verificación: ${p.pregunta_de_verificacion}\n` +
        `Qué cumpliría la gobernanza: ${p.que_cumpliria_la_gobernanza ?? "—"}\n` +
        `Resultado si cumple: ${p.resultado_si_cumple}\nVía: ${p.via}`,
    )
    .join("\n\n---\n\n");

  return `[MODO AUDITORÍA — Catálogo de Patrones de Riesgo v${CATALOGO.version}]
El usuario adjuntó un documento. Antes de analizarlo con este catálogo, ofrécele el modo auditoría con esta pregunta exacta (o una reformulación fiel):
"${CATALOGO.modo_auditoria.pregunta_de_entrada}"
No apliques el catálogo al documento hasta que el usuario consienta explícitamente.

REGLA DE PRESENTACIÓN (aplica siempre, antes y después del consentimiento): los IDs de patrón (P01, P02, P03_VOTO_Y_PAGO, etc.) y esta lista son herramientas de tu razonamiento interno, NUNCA vocabulario de cara al usuario. No los menciones, ni cites "el catálogo de patrones", ni narres tu proceso de clasificación interno ("esto podría relacionarse con P04..."). Habla siempre del fenómeno en lenguaje llano y como tu propio análisis: en vez de "P03_VOTO_Y_PAGO" di algo como "la coherencia entre pagar la cuota y tener derecho a voto"; en vez de "esto se relaciona con P07_ACTOS_ADMINISTRACION" di "quién tiene facultad para emitir este comunicado". El usuario debe leer a un consultor razonando sobre su documento, no a un sistema anunciando qué regla de su base de conocimiento va a aplicar.

Principio rector: ${CATALOGO.principio_rector}

Estándar de verificación: ${CATALOGO.modo_auditoria.estandar}

Regla de transparencia: ${CATALOGO.modo_auditoria.regla_de_transparencia}

Reglas de honestidad:
${CATALOGO.reglas_de_honestidad.map((r) => `- ${r}`).join("\n")}

Documentos auditables: ${CATALOGO.documentos_auditables.descripcion} ${CATALOGO.documentos_auditables.jerarquia_documental_interna}
No auditables: ${CATALOGO.documentos_auditables.no_auditables}

Catálogo de patrones (usa la pregunta_de_verificacion de cada uno; declara "CUMPLE" cuando las pruebas no sostengan el apartamiento):

${patrones}`;
}
