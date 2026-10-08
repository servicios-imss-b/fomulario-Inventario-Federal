import React from 'react';
import { PreguntaConfig } from '../../types/form';
import { Hash } from 'lucide-react';

interface NumberQuestionProps {
  pregunta: PreguntaConfig;
  valor: string | number;
  error?: string;
  onChange: (valor: string | number) => void;
}

export const NumberQuestion: React.FC<NumberQuestionProps> = ({
  pregunta,
  valor = '',
  error,
  onChange,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow digits, decimals, or empty
    if (/^[0-9]*\.?[0-9]*$/.test(val) || val === '') {
      onChange(val);
    }
  };

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

      <div className="relative max-w-sm">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#A57F2C]">
          <Hash className="w-4 h-4" />
        </div>
        <input
          id={`preg_${pregunta.id}`}
          type="text"
          inputMode="numeric"
          value={valor ?? ''}
          onChange={handleChange}
          placeholder={pregunta.placeholder || '0'}
          className={`w-full pl-9 pr-3.5 py-2.5 rounded-lg glass-input text-sm text-stone-100 font-mono ${
            error ? 'border-rose-500 focus:border-rose-400 focus:ring-rose-500/20' : ''
          }`}
        />
      </div>

      {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}
    </div>
  );
};
