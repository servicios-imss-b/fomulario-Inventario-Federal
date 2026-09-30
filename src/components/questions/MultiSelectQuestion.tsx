import React from 'react';
import { PreguntaConfig } from '../../types/form';
import { Check } from 'lucide-react';

interface MultiSelectQuestionProps {
  pregunta: PreguntaConfig;
  valor: string[];
  error?: string;
  onChange: (valor: string[]) => void;
}

export const MultiSelectQuestion: React.FC<MultiSelectQuestionProps> = ({
  pregunta,
  valor = [],
  error,
  onChange,
}) => {
  const selectedList = Array.isArray(valor) ? valor : [];

  const handleToggle = (opcion: string) => {
    let nextList: string[];
    const isNoAplica = opcion.toLowerCase().includes('no aplica');

    if (isNoAplica) {
      if (selectedList.includes(opcion)) {
        nextList = [];
      } else {
        nextList = [opcion];
      }
    } else {
      // If selecting a regular option, remove "No aplica" if present
      const cleaned = selectedList.filter((item) => !item.toLowerCase().includes('no aplica'));
      if (cleaned.includes(opcion)) {
        nextList = cleaned.filter((item) => item !== opcion);
      } else {
        nextList = [...cleaned, opcion];
      }
    }

    onChange(nextList);
  };

  return (
    <div className="space-y-2.5">
      <div>
        <label className="block text-sm sm:text-base font-medium text-stone-100">
          {pregunta.pregunta}
          {pregunta.requerida && (
            <span className="text-rose-400 ml-1 font-bold" title="Campo obligatorio">*</span>
          )}
        </label>
        {pregunta.instruccion && (
          <p className="text-xs text-stone-300 italic bg-black/20 p-2 rounded border-l-2 border-[#A57F2C] mt-1.5">
            {pregunta.instruccion}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
        {(pregunta.opciones || []).map((opcion, idx) => {
          const isSelected = selectedList.includes(opcion);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleToggle(opcion)}
              className={`flex items-start gap-2.5 p-3 rounded-lg text-left transition-all text-xs sm:text-sm ${
                isSelected
                  ? 'bg-[#611232]/70 border border-[#A57F2C] text-stone-100 shadow-md ring-1 ring-[#A57F2C]/40'
                  : 'bg-[#002F2A]/40 border border-[#A57F2C]/20 text-stone-300 hover:bg-[#002F2A]/70 hover:border-[#A57F2C]/40'
              }`}
            >
              <div
                className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border transition-all ${
                  isSelected
                    ? 'bg-[#A57F2C] border-[#A57F2C] text-[#002F2A]'
                    : 'border-stone-400 bg-transparent'
                }`}
              >
                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
              <span className="leading-tight select-none">{opcion}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1">
        <span>Seleccionados: {selectedList.length}</span>
        {error && <span className="text-rose-400 font-medium">{error}</span>}
      </div>
    </div>
  );
};
