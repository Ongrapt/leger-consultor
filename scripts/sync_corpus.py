"""Parsea las fuentes legales en Markdown del repo (OCR/transcripción fiel,
segmentada por artículo con tags <articulo n="X">) y las exporta a un único
JSON dentro del proyecto Next.js, para que route.ts pueda importarlo sin
depender de un runtime Python en producción.

Fuentes soportadas:
  - corpus_ley_condominio_yucatan.md: cada artículo trae, al final de su
    bloque, líneas "Capítulo"/"Sección" que marcan bajo qué capítulo/sección
    cae el SIGUIENTE artículo (ver extraer_marcadores_finales).
  - corpus_codigo_civil_yucatan.md: no trae esos marcadores inline; el propio
    archivo declara en su manifiesto qué rangos de artículos corresponden a
    qué capítulo/sección (ver RANGOS_CAPITULO_CODIGO_CIVIL), así que aquí el
    capítulo/sección se asigna por rango de número de artículo.

Uso:
    .venv/bin/python scripts/sync_corpus.py
"""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_PATH = ROOT / "src" / "lib" / "corpus" / "data.json"

ARTICULO_BLOQUE_RE = re.compile(
    r'<articulo n="(\d+)">\s*\n(.*?)\n\s*</articulo>', re.DOTALL
)

# --------------------------------------------------------------------------
# Ley sobre el Régimen de Propiedad en Condominio del Estado de Yucatán
# --------------------------------------------------------------------------

LEY_CONDOMINIO = "Ley sobre el Régimen de Propiedad en Condominio del Estado de Yucatán"
SRC_CONDOMINIO = ROOT / "corpus_ley_condominio_yucatan.md"

# Artículos citados dentro del decreto de reforma (p. ej. el Artículo 699 del
# Código Civil, transcrito al final del documento) que NO pertenecen a la Ley
# de Condominio y deben excluirse de esta fuente para no mezclar leyes.
ARTICULOS_FUERA_DE_ALCANCE_CONDOMINIO = {"699"}

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


def parsear_ley_condominio() -> list[dict]:
    texto_fuente = SRC_CONDOMINIO.read_text(encoding="utf-8")

    articulos = []
    estado = {
        "capitulo": "I",
        "nombre_capitulo": "Disposiciones generales",
        "seccion": None,
        "nombre_seccion": None,
    }

    for match in ARTICULO_BLOQUE_RE.finditer(texto_fuente):
        numero, cuerpo = match.group(1), match.group(2).strip()

        if numero in ARTICULOS_FUERA_DE_ALCANCE_CONDOMINIO:
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
                    "ley": LEY_CONDOMINIO,
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

    return articulos


# --------------------------------------------------------------------------
# Código Civil del Estado de Yucatán
# --------------------------------------------------------------------------

LEY_CODIGO_CIVIL = "Código Civil del Estado de Yucatán"
SRC_CODIGO_CIVIL = ROOT / "corpus_codigo_civil_yucatan.md"

# El archivo fuente no trae marcadores inline de capítulo/sección (a
# diferencia de la Ley de Condominio); en cambio, declara en su manifiesto
# qué rango de artículos corresponde a cada capítulo. Si se agregan más
# secciones al .md, hay que sumar su rango aquí o el artículo queda sin
# capítulo asignado (ver meta_capitulo_codigo_civil).
RANGOS_CAPITULO_CODIGO_CIVIL = [
    (680, 722, "II", "De la Copropiedad (Libro Segundo, Título Tercero)", None, None),
    (1889, 1904, "X", "De las Asociaciones (Libro Tercero, Título Sexto)", "Séptima", "De las Asociaciones"),
]


def meta_capitulo_codigo_civil(numero: int) -> tuple[str, str, str | None, str | None]:
    for desde, hasta, capitulo, nombre_capitulo, seccion, nombre_seccion in RANGOS_CAPITULO_CODIGO_CIVIL:
        if desde <= numero <= hasta:
            return capitulo, nombre_capitulo, seccion, nombre_seccion
    raise ValueError(
        f"Artículo {numero} del Código Civil sin capítulo asignado; "
        "añade su rango a RANGOS_CAPITULO_CODIGO_CIVIL"
    )


def parsear_codigo_civil() -> list[dict]:
    if not SRC_CODIGO_CIVIL.exists():
        return []

    texto_fuente = SRC_CODIGO_CIVIL.read_text(encoding="utf-8")

    articulos = []
    for match in ARTICULO_BLOQUE_RE.finditer(texto_fuente):
        numero, cuerpo = match.group(1), match.group(2).strip()
        capitulo, nombre_capitulo, seccion, nombre_seccion = meta_capitulo_codigo_civil(int(numero))

        articulos.append(
            {
                "id_vector": f"YUC_CIVIL_ART_{numero}",
                "meta": {
                    "ley": LEY_CODIGO_CIVIL,
                    "capitulo": capitulo,
                    "nombre_capitulo": nombre_capitulo,
                    "seccion": seccion,
                    "nombre_seccion": nombre_seccion,
                    "articulo": int(numero),
                    # El texto de este archivo no trae un título separado
                    # del cuerpo (el artículo empieza directo con "Artículo
                    # N.- ..."), a diferencia de la Ley de Condominio.
                    "titulo": None,
                },
                "texto_original": cuerpo,
            }
        )

    return articulos


def main() -> None:
    articulos = parsear_ley_condominio() + parsear_codigo_civil()

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(
        json.dumps({"articulos": articulos}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Exportados {len(articulos)} artículos a {OUT_PATH}")


if __name__ == "__main__":
    main()
