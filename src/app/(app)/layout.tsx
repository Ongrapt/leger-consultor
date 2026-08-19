import { auth } from "@clerk/nextjs/server";
import AppSidebar from "@/components/AppSidebar";
import { listarTodosLosChats } from "@/lib/actions/chats";
import { listarDocumentos, listarDocumentosArchivados } from "@/lib/actions/documentos";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  const [documentos, chats, archivados] = await Promise.all([
    listarDocumentos(),
    listarTodosLosChats(),
    listarDocumentosArchivados(),
  ]);

  return (
    <AppSidebar
      documentos={documentos}
      chats={chats}
      archivados={archivados}
      estaAutenticado={!!userId}
    >
      {children}
    </AppSidebar>
  );
}
