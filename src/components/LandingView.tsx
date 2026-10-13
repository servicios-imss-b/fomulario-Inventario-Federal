import React, { useState } from 'react';
import {
  Activity,
  ArrowRight,
  Database,
  FileText,
  LoaderCircle,
  MapPin,
  ShieldCheck,
  Users,
} from 'lucide-react';

const QUESTIONNAIRE_SECTIONS = [
  { title: 'Datos generales', detail: 'Identificación del programa, su responsable y datos de captura.', icon: FileText },
  { title: 'Normatividad y objetivo del programa', detail: 'Reglas, documentos normativos y objetivo de la intervención.', icon: ShieldCheck },
  { title: 'Población potencial y objetivo', detail: 'Poblaciones a las que se dirige el programa.', icon: Users },
  { title: 'Criterios de priorización y ámbito de atención', detail: 'Criterios aplicados y cobertura territorial.', icon: MapPin },
  { title: 'Padrón de beneficiarios y contraloría social', detail: 'Registro de beneficiarios y vigilancia social.', icon: Database },
  { title: 'Apoyos otorgados y población atendida', detail: 'Tipos de apoyo, montos y personas atendidas.', icon: Activity },
];

interface LandingViewProps {
  onStart: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onStart,
}) => {
  const [isStarting, setIsStarting] = useState(false);

  const startQuestionnaire = () => {
    if (isStarting) return;
    setIsStarting(true);
    onStart();
  };

  return (
    <section className="flex min-h-[calc(100svh-68px)] w-full items-center justify-center px-4 py-6 sm:px-6 sm:py-8">
      <div className="w-full max-w-[940px] py-3 sm:py-5">
        <header className="landing-title-panel text-center">
        <h1 className="mx-auto max-w-[24ch] text-2xl font-bold leading-tight text-white drop-shadow-md sm:text-3xl">
          Instrumento de captación del
        </h1>
        <p className="mx-auto mt-3 max-w-[38ch] text-base font-medium leading-6 text-white/90 sm:text-lg">
          Inventario Federal de Programa y Acciones de Desarrollo Social
        </p>
        <p className="mt-2 text-sm font-semibold text-[#e2bd68] sm:text-base">
          2024 y 2025
        </p>
        </header>

        <div className="mx-auto mt-6 max-w-[78ch] rounded-lg border border-white/15 border-l-2 border-l-[#e2bd68] bg-[#062d28]/90 px-4 py-3.5 text-left text-xs leading-5 text-white/95 shadow-lg backdrop-blur-md sm:px-5 sm:py-4 sm:text-[13px] sm:leading-6">
          <p>
            El Inventario Federal de Programas y Acciones de Desarrollo Social (IPADS), a cargo del Instituto Nacional de Estadística, Geografía e Informática (INEGI), genera información sobre las acciones del ámbito federal con el propósito de identificar, clasificar y sistematizar las intervenciones que integran la política de desarrollo social, como insumo para su evaluación integral.
          </p>
          <p className="mt-2">
            En este contexto, el INEGI solicitó al IMSS-BIENESTAR la información correspondiente a sus programas operados.
          </p>
        </div>

        <div className="mt-7 text-left">
          <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-xs font-bold uppercase text-[#e2bd68] sm:text-sm">
            Secciones del cuestionario
          </h2>
          <span className="text-[10px] font-medium text-white/55 sm:text-xs">6 apartados</span>
          </div>
          <ol className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
            {QUESTIONNAIRE_SECTIONS.map(({ title, detail, icon: SectionIcon }, index) => (
              <li key={title}>
                <article className="group flex min-h-[92px] items-start gap-3 rounded-lg border border-white/20 bg-[#07332e]/75 px-3.5 py-3 shadow-[0_8px_22px_rgba(0,0,0,0.2)] backdrop-blur-sm transition hover:border-[#d5ad58]/60 hover:bg-[#0a4039]/90 sm:min-h-[104px] sm:px-4 sm:py-3.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-[#d5ad58]/35 bg-[#d5ad58]/10 text-[#e2bd68] transition group-hover:bg-[#d5ad58]/20">
                    <SectionIcon className="h-[18px] w-[18px]" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[9px] font-bold uppercase text-[#e2bd68] sm:text-[10px]">Sección {String(index + 1).padStart(2, '0')}</span>
                    <span className="mt-1 block text-xs font-semibold leading-snug text-white sm:text-[13px]">{title}</span>
                    <span className="mt-1 block text-[10px] leading-4 text-white/65 sm:text-[11px]">{detail}</span>
                  </span>
                </article>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3">
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
                Comenzar
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
};
