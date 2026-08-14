import WatchBackground from "@/components/WatchBackground";
import NuevoAnalisisModal from "@/components/NuevoAnalisisModal";

export default function InicioPage() {
  return (
    <WatchBackground className="flex h-full min-h-[calc(100dvh-49px)] flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-2xl font-medium text-foreground/80">
          ¿En qué puedo ayudarte hoy?
        </p>
        <p className="max-w-md text-sm text-foreground/50">
          Consultor de Procesos Administrativos en Condominio, basado en la
          Ley de Propiedad en Condominio de Yucatán. Crea un nuevo análisis
          para empezar, por ejemplo sobre un Acta del Régimen.
        </p>
        <NuevoAnalisisModal className="mt-2" />
      </div>
    </WatchBackground>
  );
}
