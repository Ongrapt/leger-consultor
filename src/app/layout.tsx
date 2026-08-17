import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import VersionLogger from "@/components/VersionLogger";
import packageJson from "../../package.json";
import "./globals.css";

// La app siempre usa tema oscuro (ver globals.css); estas variables replican
// esa misma paleta dentro de los componentes de Clerk (SignIn, SignUp, etc.).
const clerkAppearance = {
  variables: {
    colorPrimary: "#ececec",
    colorPrimaryForeground: "#212121",
    colorBackground: "#2f2f2f",
    colorForeground: "#ececec",
    colorInput: "#212121",
    colorInputForeground: "#ececec",
    colorMuted: "#212121",
    colorMutedForeground: "#a3a3a3",
    colorBorder: "#3d3d3d",
    colorNeutral: "#ececec",
  },
} as const;

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
        <VersionLogger
          version={packageJson.version}
          commit={process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null}
          entorno={process.env.VERCEL_ENV ?? "development"}
        />
        <ClerkProvider afterSignOutUrl="/sign-in" appearance={clerkAppearance}>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
