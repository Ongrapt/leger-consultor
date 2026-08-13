import data from "./data.json";

export interface ArticuloMeta {
  ley: string;
  capitulo: string;
  nombre_capitulo: string;
  seccion: string | null;
  nombre_seccion: string | null;
  articulo: number;
  titulo: string | null;
}

export interface Articulo {
  id_vector: string;
  meta: ArticuloMeta;
  texto_original: string;
}

const ARTICULOS = (data as { articulos: Articulo[] }).articulos;

const STOPWORDS = new Set([
  "de",
  "la",
  "el",
  "los",
  "las",
  "en",
  "y",
  "a",
  "que",
  "un",
  "una",
  "unos",
  "unas",
  "por",
  "para",
  "con",
  "sin",
  "su",
  "sus",
  "se",
  "es",
  "del",
  "al",
  "lo",
  "como",
  "más",
  "pero",
  "si",
  "no",
  "esta",
  "este",
  "esto",
  "esa",
  "ese",
  "eso",
  "mi",
  "tu",
  "yo",
  "me",
  "ha",
  "han",
  "hay",
  "muy",
  "puede",
  "pueden",
  "sobre",
  "entre",
  "cuando",
  "donde",
  "porque",
  "qué",
  "cómo",
  "cuál",
  "cuáles",
]);

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function tokenizar(texto: string): Set<string> {
  return new Set(
    normalizar(texto)
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((palabra) => palabra.length > 2 && !STOPWORDS.has(palabra)),
  );
}

const TOKENS_POR_ARTICULO = new Map<string, Set<string>>(
  ARTICULOS.map((a) => [
    a.id_vector,
    tokenizar(`${a.meta.titulo ?? ""} ${a.texto_original}`),
  ]),
);

/**
 * Selecciona los artículos del corpus cuyo contenido (título + texto)
 * comparte más términos significativos con el mensaje del usuario,
 * ordenados por número de coincidencias.
 */
export function seleccionarArticulosRelevantes(
  mensaje: string,
  limite = 6,
): Articulo[] {
  const tokensConsulta = tokenizar(mensaje);
  if (tokensConsulta.size === 0) return [];

  const puntuados = ARTICULOS.map((articulo) => {
    const tokensArticulo = TOKENS_POR_ARTICULO.get(articulo.id_vector)!;
    let coincidencias = 0;
    for (const token of tokensConsulta) {
      if (tokensArticulo.has(token)) coincidencias++;
    }
    return { articulo, coincidencias };
  });

  return puntuados
    .filter((p) => p.coincidencias > 0)
    .sort((a, b) => b.coincidencias - a.coincidencias)
    .slice(0, limite)
    .map((p) => p.articulo);
}

/**
 * Serializa artículos a un bloque de texto para inyectar en el prompt,
 * citando la fuente exacta (ley, capítulo, artículo) de cada fragmento.
 */
export function formatearBloqueCorpus(articulos: Articulo[]): string {
  if (articulos.length === 0) {
    return "(Sin artículos del corpus con coincidencia de términos para este mensaje. No fundamentes en leyes fuera de este corpus; indícalo al usuario.)";
  }

  return articulos
    .map(({ meta, texto_original, id_vector }) => {
      const ubicacion = [
        `Capítulo ${meta.capitulo} (${meta.nombre_capitulo})`,
        meta.seccion ? `Sección ${meta.seccion} (${meta.nombre_seccion})` : null,
      ]
        .filter(Boolean)
        .join(", ");

      return `[${id_vector} — Artículo ${meta.articulo} — ${ubicacion}]\n${texto_original}`;
    })
    .join("\n\n---\n\n");
}

export function totalArticulos(): number {
  return ARTICULOS.length;
}
