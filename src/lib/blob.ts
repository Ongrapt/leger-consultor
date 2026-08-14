const ARCHIVOS_PREFIX = "/api/archivos/";

export function pathnameParaDocumento(documentId: string, filename: string) {
  return `documentos/${documentId}/${crypto.randomUUID()}-${filename}`;
}

export function urlProxyDeArchivo(pathname: string) {
  return `${ARCHIVOS_PREFIX}${pathname}`;
}

/** Extrae el documentId de un pathname `documentos/<id>/...` o de una URL proxy `/api/archivos/documentos/<id>/...`. */
export function documentIdDePathname(pathnameOrUrl: string): string | null {
  const pathname = pathnameOrUrl.startsWith(ARCHIVOS_PREFIX)
    ? pathnameOrUrl.slice(ARCHIVOS_PREFIX.length)
    : pathnameOrUrl;
  const match = /^documentos\/([^/]+)\//.exec(pathname);
  return match ? match[1] : null;
}

export { ARCHIVOS_PREFIX };
