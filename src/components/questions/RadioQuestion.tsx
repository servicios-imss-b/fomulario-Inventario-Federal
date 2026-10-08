import React from 'react';
import { PreguntaConfig } from '../../types/form';

interface RadioQuestionProps {
  pregunta: PreguntaConfig;
  valor: string;
  error?: string;
  onChange: (valor: string) => void;
}

export const RadioQuestion: React.FC<RadioQuestionProps> = ({
  pregunta,
  valor = '',
  error,
  onChange,
}) => {
  return (
    <div className="space-y-2.5">
      <div>
        <label className="block text-sm sm:text-base font-medium text-black">
          {pregunta.pregunta}
          {pregunta.requerida && (
            <span className="text-rose-400 ml-1 font-bold" title="Campo obligatorio">*</span>
          )}
        </label>
        {pregunta.instruccion && (
          <p className="text-xs text-black/90 italic border-l-2 border-[#A57F2C] pl-2 mt-1.5">
            {pregunta.instruccion}
          </p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-1">
        {(pregunta.opciones || []).map((opcion, idx) => {
          const isSelected = valor === opcion;
          return (
            <label
              key={idx}
              onClick={() => onChange(opcion)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all text-xs sm:text-sm border ${
                isSelected
                  ? 'bg-[#611232]/70 border-[#A57F2C] text-stone-100 shadow-md ring-1 ring-[#A57F2C]/50'
                  : 'bg-[#002F2A]/40 border-[#A57F2C]/20 text-black hover:bg-[#002F2A]/70'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                  isSelected ? 'border-[#A57F2C] bg-transparent' : 'border-stone-400 bg-transparent'
                }`}
              >
                {isSelected && <div className="w-2 h-2 rounded-full bg-[#A57F2C]" />}
              </div>
              <span className="font-medium select-none">{opcion}</span>
            </label>
          );
        })}
      </div>

      {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}
    </div>
  );
};
