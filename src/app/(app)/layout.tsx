import AppSidebar from "@/components/AppSidebar";
import { listarDocumentos } from "@/lib/actions/documentos";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const documentos = await listarDocumentos();

  return <AppSidebar documentos={documentos}>{children}</AppSidebar>;
}
