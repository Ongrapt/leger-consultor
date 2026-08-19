"use client";

import { useState } from "react";

const PREGUNTAS = [
  {
    pregunta: "¿Qué funciones tiene Leger? ¿Qué hace exactamente?",
    respuesta:
      "Leger es un consultor de procesos administrativos en condominio, basado en la Ley de Propiedad en Condominio de Yucatán. Le subes actas, convocatorias, reglamentos o estados de cuenta y te ayuda a: revisar si una convocatoria o asamblea cumple con los requisitos legales, calcular quórum y mayorías, explicar cláusulas del reglamento, detectar irregularidades en cobros de cuotas, y responder dudas puntuales sobre el proceso administrativo del condominio, siempre citando el fundamento legal en el que se basa. No sustituye una asesoría legal formal, pero te da una primera lectura clara y fundamentada antes de necesitar una.",
  },
  {
    pregunta: "¿Qué es el indiviso?",
    respuesta:
      "El indiviso es el porcentaje que le corresponde a cada unidad privativa (departamento, casa o local) sobre las áreas y bienes comunes del condominio. Se fija en la escritura constitutiva o en el reglamento, normalmente en proporción al tamaño o valor de cada unidad respecto al total del condominio. Ese mismo porcentaje es, por ley, la base para calcular tanto las cuotas de mantenimiento que le tocan a cada propietario como su peso de voto en las asambleas — por eso es tan importante verificar que el indiviso declarado en tus documentos coincida con el que realmente te corresponde. Si subes tu escritura o reglamento, Leger puede ayudarte a ubicarlo y verificar que los cálculos derivados de él sean correctos.",
  },
];

export default function PreguntasDemo() {
  const [abierta, setAbierta] = useState<number | null>(null);

  return (
    <div className="mt-6 flex w-full max-w-md flex-col gap-2">
      <p className="text-xs font-medium uppercase tracking-wide text-foreground/40">
        Pruébalo sin crear cuenta
      </p>
      {PREGUNTAS.map((item, i) => {
        const abiertaActual = abierta === i;
        return (
          <div key={item.pregunta} className="rounded-xl border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setAbierta(abiertaActual ? null : i)}
              aria-expanded={abiertaActual}
              className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-sm text-foreground/80 transition-colors hover:bg-surface"
            >
              {item.pregunta}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className={`h-3.5 w-3.5 shrink-0 text-foreground/40 transition-transform ${abiertaActual ? "rotate-90" : ""}`}
                aria-hidden="true"
              >
                <path
                  d="M9 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {abiertaActual && (
              <p className="border-t border-border px-3.5 py-3 text-left text-sm leading-relaxed text-foreground/60">
                {item.respuesta}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
