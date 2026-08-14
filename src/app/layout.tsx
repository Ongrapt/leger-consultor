import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Leger — Consultor de Condominios",
  description:
    "Consultor de Procesos Administrativos en Condominio, especializado en el marco legal del Estado de Yucatán.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ClerkProvider afterSignOutUrl="/sign-in">{children}</ClerkProvider>
      </body>
    </html>
  );
}
