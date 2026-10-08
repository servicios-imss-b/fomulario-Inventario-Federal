import React from 'react';

interface ProgressBarProps {
  seccionActualIndex: number; // 0-based
  totalSecciones: number;
  nombreSeccionActual: string;
  porcentaje: number;
  onSelectSeccion?: (index: number) => void;
  maxSeccionAlcanzada?: number;
  seccionesBloqueadas?: number[];
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  seccionActualIndex,
  totalSecciones,
  nombreSeccionActual,
  porcentaje,
  onSelectSeccion,
  maxSeccionAlcanzada = 0,
  seccionesBloqueadas = [],
}) => {
  return (
    <div className="w-full px-3 py-1.5 sm:px-4 sm:py-2 backdrop-blur-md z-30 sticky top-[68px]">
      <div className="max-w-7xl mx-auto flex flex-col gap-1 sm:gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5">
        <div className="flex items-center justify-between text-[11px] sm:text-xs">
          <div className="flex items-center space-x-2 font-sans font-medium tracking-[0.01em]">
            <span className="text-white font-semibold">
              Sección {seccionActualIndex + 1} de {totalSecciones}
            </span>
            <span className="text-white">|</span>
            <span className="text-white truncate max-w-[200px] sm:max-w-md md:max-w-lg font-medium">
              {nombreSeccionActual}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-sans text-[11px] font-semibold text-white">
              {Math.round(porcentaje)}%
            </span>
          </div>
        </div>

        {/* Barra de Progreso - Sólida sin degradados */}
        <div className="w-full bg-[#041a17] h-1.5 rounded-full overflow-hidden border border-[#A57F2C]/25">
          <div
            className="h-full bg-[#A57F2C] transition-all duration-300 ease-out rounded-full"
            style={{ width: `${Math.min(100, Math.max(0, porcentaje))}%` }}
          />
        </div>

        {/* Puntos de secciones discretos */}
        <div className="hidden sm:flex items-center justify-between pt-0.5">
          {Array.from({ length: totalSecciones }).map((_, idx) => {
            const isCurrent = idx === seccionActualIndex;
            const isCompleted = idx < seccionActualIndex;
            const isAccessible = idx <= maxSeccionAlcanzada && !seccionesBloqueadas.includes(idx);

            return (
              <button
                key={idx}
                type="button"
                onClick={() => isAccessible && onSelectSeccion?.(idx)}
                disabled={!isAccessible}
                title={`Ir a sección ${idx + 1}`}
                className={`flex items-center justify-center transition-all ${
                  isAccessible ? 'cursor-pointer' : 'cursor-not-allowed opacity-35'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-sans font-medium transition-all ${
                    isCurrent
                      ? 'bg-[#A57F2C] text-black scale-125 ring-2 ring-stone-200'
                      : isCompleted
                      ? 'bg-emerald-600 text-black'
                      : 'bg-white/60 text-black border border-[#A57F2C]/40'
                  }`}
                >
                  {idx + 1}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
