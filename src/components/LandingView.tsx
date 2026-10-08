import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  LoaderCircle,
  MapPin,
  Users,
} from 'lucide-react';

interface LandingViewProps {
  onStart: () => void;
  hasSavedData: boolean;
  onResume?: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onStart,
  hasSavedData,
  onResume,
}) => {
  const [isStarting, setIsStarting] = useState(false);

  const startQuestionnaire = () => {
    if (isStarting) return;
    setIsStarting(true);
    onStart();
  };

  const resumeQuestionnaire = () => {
    if (isStarting || !onResume) return;
    setIsStarting(true);
    onResume();
  };

  return (
    <section className="flex min-h-[calc(100svh-68px)] w-full items-center justify-center px-4 py-6 sm:px-6 sm:py-8">
      <div className="w-full max-w-[570px] rounded-2xl border border-white/30 bg-[#202322]/45 px-5 py-6 text-center shadow-[0_24px_70px_rgba(0,0,0,0.38)] backdrop-blur-xl sm:px-10 sm:py-8">
        <h1 className="mx-auto max-w-[24ch] text-[clamp(1.5rem,3.6vw,2.1rem)] font-bold leading-[1.08] tracking-tight text-white drop-shadow-md">
          Instrumento de captación del
        </h1>
        <p className="mx-auto mt-3 max-w-[38ch] text-base font-medium leading-6 text-white/90 sm:text-lg">
          Inventario Federal de Programa y Acciones de Desarrollo Social
        </p>
        <p className="mt-2 text-sm font-semibold tracking-[0.18em] text-[#e2bd68] sm:text-base">
          2024 y 2025
        </p>

        <div className="mx-auto mt-6 h-px w-full max-w-sm bg-white/25" />

        <div className="mx-auto mt-4 grid max-w-sm grid-cols-3 gap-2.5 text-white sm:gap-3">
          <div className="flex min-h-[58px] flex-col items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-black/10 px-2 py-2 text-[10px] font-medium shadow-inner sm:text-[11px]">
            <FileText className="h-4 w-4 text-[#d5ad58]" aria-hidden="true" />
            <span>Datos del programa</span>
          </div>
          <div className="flex min-h-[58px] flex-col items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-black/10 px-2 py-2 text-[10px] font-medium shadow-inner sm:text-[11px]">
            <Users className="h-4 w-4 text-[#d5ad58]" aria-hidden="true" />
            <span>Población objetivo</span>
          </div>
          <div className="flex min-h-[58px] flex-col items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-black/10 px-2 py-2 text-[10px] font-medium shadow-inner sm:text-[11px]">
            <MapPin className="h-4 w-4 text-[#d5ad58]" aria-hidden="true" />
            <span>Apoyos y cobertura</span>
          </div>
        </div>

        <p className="mx-auto mt-5 max-w-[46ch] text-xs leading-5 text-white/80 sm:text-[13px]">
          Captura responsables, normatividad, población objetivo, cobertura territorial y apoyos otorgados durante los ejercicios 2024 y 2025.
        </p>

        <div className="mt-6 flex flex-col items-center gap-3">
          {hasSavedData && onResume && (
            <button
              type="button"
              onClick={resumeQuestionnaire}
              disabled={isStarting}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/40 bg-white/10 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#002f2a] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Continuar registro guardado
            </button>
          )}
          <button
            type="button"
            onClick={startQuestionnaire}
            disabled={isStarting}
            aria-busy={isStarting}
            className="inline-flex min-h-11 min-w-[168px] items-center justify-center gap-2 rounded-full bg-[#c49a3a] px-7 py-3 text-sm font-bold text-[#101b18] shadow-[0_8px_22px_rgba(0,0,0,0.25)] transition hover:bg-[#d4ad52] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#002f2a] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isStarting ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                Abriendo…
              </>
            ) : (
              <>
                {hasSavedData ? 'Comenzar nuevo' : 'Comenzar'}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
};
