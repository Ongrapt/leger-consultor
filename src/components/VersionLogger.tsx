"use client";

import { useEffect } from "react";

export default function VersionLogger({
  version,
  commit,
  entorno,
}: {
  version: string;
  commit: string | null;
  entorno: string;
}) {
  useEffect(() => {
    console.log(
      `[Leger] v${version}${commit ? ` · commit ${commit}` : ""} · ${entorno}`,
    );
  }, [version, commit, entorno]);

  return null;
}
