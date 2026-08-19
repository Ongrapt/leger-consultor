"use client";

import { upload } from "@vercel/blob/client";
import { PDFDocument } from "pdf-lib";
import { useState } from "react";
import { agregarFuente } from "@/lib/actions/fuentes";
import { pathnameParaDocumento, urlProxyDeArchivo } from "@/lib/blob";
import { LIMITE_PAGINAS_ANALISIS, LIMITE_PAGINAS_PDF } from "@/lib/usage-shared";

// Lógica de subida sin estado de React, para usarse fuera de un hook (por
// ejemplo, al crear un análisis nuevo con archivo desde un modal, antes de
// que exista un componente montado con el documentId ya fijo).
export async function subirYRegistrarFuente(
  documentId: string,
  file: File,
  paginasUsadas: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const espacioLibre = LIMITE_PAGINAS_ANALISIS - paginasUsadas;

  // Una imagen cuenta como 1 página; un PDF, sus páginas reales.
  let paginasDelArchivo = 1;
  if (file.type === "application/pdf") {
    try {
      const doc = await PDFDocument.load(await file.arrayBuffer(), {
        ignoreEncryption: true,
      });
      paginasDelArchivo = doc.getPageCount();
    } catch {
      return { ok: false, error: "No se pudo leer el PDF." };
    }
    if (paginasDelArchivo > LIMITE_PAGINAS_PDF) {
      return {
        ok: false,
        error: `Este PDF tiene ${paginasDelArchivo} páginas; el límite es ${LIMITE_PAGINAS_PDF} por archivo.`,
      };
    }
  }

  if (paginasDelArchivo > espacioLibre) {
    return {
      ok: false,
      error: `Este análisis ya usa ${paginasUsadas} de ${LIMITE_PAGINAS_ANALISIS} páginas; este archivo no cabe.`,
    };
  }

  try {
    const resultado = await upload(pathnameParaDocumento(documentId, file.name), file, {
      access: "private",
      handleUploadUrl: "/api/upload",
      clientPayload: JSON.stringify({ documentId }),
    });
    await agregarFuente(documentId, {
      nombreArchivo: file.name,
      url: urlProxyDeArchivo(resultado.pathname),
      contentType: resultado.contentType,
    });
    return { ok: true };
  } catch (err) {
    console.error("[fuentes] Error al agregar fuente:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error al subir el archivo",
    };
  }
}

export function useFuenteUploader(documentId: string, paginasUsadas: number) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subirArchivo(file: File) {
    setError(null);
    setSubiendo(true);
    const resultado = await subirYRegistrarFuente(documentId, file, paginasUsadas);
    setSubiendo(false);
    if (!resultado.ok) {
      setError(resultado.error);
      return false;
    }
    return true;
  }

  return {
    subirArchivo,
    subiendo,
    error,
    setError,
    espacioLibre: LIMITE_PAGINAS_ANALISIS - paginasUsadas,
  };
}
