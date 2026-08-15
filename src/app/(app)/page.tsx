import { auth } from "@clerk/nextjs/server";
import { SignUpButton } from "@clerk/nextjs";
import Link from "next/link";
import WatchBackground from "@/components/WatchBackground";
import NuevaConsultaButton from "@/components/NuevaConsultaButton";
import NuevoAnalisisModal from "@/components/NuevoAnalisisModal";

export default async function InicioPage() {
  const { userId } = await auth();

  return (
    <WatchBackground className="flex h-full flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-2xl font-medium text-foreground/80">
          ¿En qué puedo ayudarte hoy?
        </p>
        <p className="max-w-md text-sm text-foreground/50">
          Consultor de Procesos Administrativos en Condominio, basado en la
          Ley de Propiedad en Condominio de Yucatán. Crea un nuevo análisis
          para empezar, por ejemplo sobre un Acta del Régimen.
        </p>
        {userId ? (
          <div className="mt-2 flex gap-2">
            <NuevoAnalisisModal />
            <NuevaConsultaButton />
          </div>
        ) : (
          <div className="mt-2 flex flex-col items-center gap-2">
            <SignUpButton mode="redirect">
              <button
                type="button"
                className="flex items-center justify-center gap-1.5 rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                Crear cuenta gratis
              </button>
            </SignUpButton>
            <p className="text-xs text-foreground/40">
              Incluye 3 consultas sin costo. ¿Ya tienes cuenta?{" "}
              <Link href="/sign-in" className="underline hover:text-foreground/70">
                Inicia sesión
              </Link>
            </p>
          </div>
        )}
      </div>
    </WatchBackground>
  );
}
