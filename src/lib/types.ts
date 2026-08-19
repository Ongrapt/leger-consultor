import type { Uso } from "@/lib/usage-shared";

export type AnalysisType = "acta" | "convocatoria" | "reglamento" | "comunicado";

export type ChatMode = "chat" | "analisis";

export interface SourceFile {
  id: string;
  fileName: string;
  pageCount: number | null;
}

export interface Chat {
  id: string;
  title: string;
  mode: ChatMode;
  analysisProjectId?: string;
}

export interface AnalysisProject {
  id: string;
  title: string;
  type?: AnalysisType;
  sources: SourceFile[];
  chats: Chat[];
}

export interface UserLimits {
  freeChatsUsed: number;
  freeAnalysisDocsUsed: number;
  isSubscribed: boolean;
}

/** Adapta el `Uso` real (server) a la forma de UserLimits que consume la UI, sin duplicar la fuente de verdad. */
export function usoAUserLimits(uso: Uso): UserLimits {
  return {
    freeChatsUsed: uso.consultasUsadas,
    freeAnalysisDocsUsed: uso.documentosAnalizados,
    isSubscribed: uso.plan === "subscription",
  };
}
