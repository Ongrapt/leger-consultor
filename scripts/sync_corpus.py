"""Parsea el corpus legal real (corpus_ley_condominio_yucatan.md, OCR de la
Ley sobre el Régimen de Propiedad en Condominio del Estado de Yucatán) y lo
exporta a JSON dentro del proyecto Next.js, para que route.ts pueda
importarlo sin depender de un runtime Python en producción.

Uso:
    .venv/bin/python scripts/sync_corpus.py
"""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC_MD = ROOT / "corpus_ley_condominio_yucatan.md"
OUT_PATH = ROOT / "src" / "lib" / "corpus" / "data.json"

LEY = "Ley sobre el Régimen de Propiedad en Condominio del Estado de Yucatán"

# Artículos citados dentro del decreto de reforma (p. ej. el Artículo 699 del
# Código Civil, transcrito al final del documento) que NO pertenecen a la Ley
# de Condominio y deben excluirse del corpus para no mezclar fuentes legales.
ARTICULOS_FUERA_DE_ALCANCE = {"699"}

ARTICULO_BLOQUE_RE = re.compile(
    r'<articulo n="(\d+)">\s*\n(.*?)\n\s*</articulo>', re.DOTALL
)
DECRETO_TRANSITORIO_RE = re.compile(
    r"\n(Artículo (?:primero|segundo|tercero|cuarto|quinto)\..*)$",
    re.DOTALL,
)
CAPITULO_RE = re.compile(r"^Capítulo\s+([IVXLCDM]+)$")
SECCION_RE = re.compile(r"^Sección\s+(\S+)$")
TITULO_ARTICULO_RE = re.compile(r"^Artículo\s+\d+\.?\-?\s*(.*)$")


def extraer_marcadores_finales(lineas: list[str]) -> tuple[list[str], list[tuple[str, str, str]]]:
    """Localiza, dentro del bloque, la primera línea que sea un marcador puro
    de Capítulo o Sección (título del capítulo/sección que aplica a partir
    del SIGUIENTE artículo). Todo lo anterior es texto real del artículo;
    todo lo posterior son marcadores, cuyo título puede abarcar varias
    líneas (se consumen hasta el siguiente marcador o el final del bloque).
    Devuelve las líneas del texto real y los marcadores en orden de
    aparición."""
    inicio = None
    for i, linea in enumerate(lineas):
        if CAPITULO_RE.match(linea) or SECCION_RE.match(linea):
            inicio = i
            break

    if inicio is None:
        return lineas, []

    texto_lineas = lineas[:inicio]
    resto = lineas[inicio:]

    marcadores: list[tuple[str, str, str]] = []
    i = 0
    while i < len(resto):
        cap = CAPITULO_RE.match(resto[i])
        sec = SECCION_RE.match(resto[i])
        tipo = "capitulo" if cap else "seccion"
        valor = (cap or sec).group(1)
        i += 1
        titulo_lineas = []
        while i < len(resto) and not CAPITULO_RE.match(resto[i]) and not SECCION_RE.match(resto[i]):
            titulo_lineas.append(resto[i])
            i += 1
        marcadores.append((tipo, valor, " ".join(titulo_lineas).strip()))

    return texto_lineas, marcadores


def main() -> None:
    texto_fuente = SRC_MD.read_text(encoding="utf-8")

    articulos = []
    estado = {
        "capitulo": "I",
        "nombre_capitulo": "Disposiciones generales",
        "seccion": None,
        "nombre_seccion": None,
    }

    for match in ARTICULO_BLOQUE_RE.finditer(texto_fuente):
        numero, cuerpo = match.group(1), match.group(2).strip()

        if numero in ARTICULOS_FUERA_DE_ALCANCE:
            continue

        cuerpo = DECRETO_TRANSITORIO_RE.sub("", cuerpo).rstrip()

        lineas = cuerpo.split("\n")
        lineas, marcadores = extraer_marcadores_finales(lineas)
        texto_original = "\n".join(lineas).strip()

        meta_capitulo = estado["capitulo"]
        meta_nombre_capitulo = estado["nombre_capitulo"]
        meta_seccion = estado["seccion"]
        meta_nombre_seccion = estado["nombre_seccion"]

        titulo_match = TITULO_ARTICULO_RE.match(lineas[0]) if lineas else None
        titulo = titulo_match.group(1).strip() if titulo_match else None

        articulos.append(
            {
                "id_vector": f"YUC_CONDO_ART_{numero}",
                "meta": {
                    "ley": LEY,
                    "capitulo": meta_capitulo,
                    "nombre_capitulo": meta_nombre_capitulo,
                    "seccion": meta_seccion,
                    "nombre_seccion": meta_nombre_seccion,
                    "articulo": int(numero),
                    "titulo": titulo,
                },
                "texto_original": texto_original,
            }
        )

        for tipo, valor, titulo_marcador in marcadores:
            if tipo == "capitulo":
                estado["capitulo"] = valor
                estado["nombre_capitulo"] = titulo_marcador
                estado["seccion"] = None
                estado["nombre_seccion"] = None
            elif tipo == "seccion":
                estado["seccion"] = valor
                estado["nombre_seccion"] = titulo_marcador

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(
        json.dumps({"articulos": articulos}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Exportados {len(articulos)} artículos a {OUT_PATH}")


if __name__ == "__main__":
    main()
