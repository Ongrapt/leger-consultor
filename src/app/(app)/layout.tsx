import { auth } from "@clerk/nextjs/server";
import AppSidebar from "@/components/AppSidebar";
import { listarDocumentos } from "@/lib/actions/documentos";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  const documentos = await listarDocumentos();

  return (
    <AppSidebar documentos={documentos} estaAutenticado={!!userId}>
      {children}
    </AppSidebar>
  );
}
