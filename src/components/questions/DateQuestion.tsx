import React from 'react';
import { PreguntaConfig } from '../../types/form';
import { Calendar } from 'lucide-react';

interface DateQuestionProps {
  pregunta: PreguntaConfig;
  valor: string;
  error?: string;
  onChange: (valor: string) => void;
}

export const DateQuestion: React.FC<DateQuestionProps> = ({
  pregunta,
  valor = '',
  error,
  onChange,
}) => {
  return (
    <div className="space-y-2">
      <label
        htmlFor={`preg_${pregunta.id}`}
        className="block text-sm sm:text-base font-medium text-black"
      >
        {pregunta.pregunta}
        {pregunta.requerida && (
          <span className="text-rose-400 ml-1 font-bold" title="Campo obligatorio">*</span>
        )}
      </label>

      {pregunta.instruccion && (
        <p className="text-xs text-black/90 italic border-l-2 border-[#A57F2C] pl-2">
          {pregunta.instruccion}
        </p>
      )}

      <div className="relative max-w-xs">
        <input
          id={`preg_${pregunta.id}`}
          type="date"
          value={valor || ''}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full px-3.5 py-2.5 rounded-lg glass-input text-sm text-stone-100 cursor-pointer ${
            error ? 'border-rose-500 focus:border-rose-400' : ''
          }`}
        />
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-[#A57F2C]">
          <Calendar className="w-4 h-4" />
        </div>
      </div>

      {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}
    </div>
  );
};
