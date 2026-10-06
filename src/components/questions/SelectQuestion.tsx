import React from 'react';
import { PreguntaConfig } from '../../types/form';
import { ChevronDown, Bookmark } from 'lucide-react';

interface SelectQuestionProps {
  pregunta: PreguntaConfig;
  valor: string;
  fuente?: string;
  error?: string;
  onChange: (valor: string, fuente?: string) => void;
}

export const SelectQuestion: React.FC<SelectQuestionProps> = ({
  pregunta,
  valor = '',
  fuente = '',
  error,
  onChange,
}) => {
  const [mostrarFuente, setMostrarFuente] = React.useState(Boolean(fuente));
  const max = pregunta.maxCaracteres || 300;

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <label
          htmlFor={`preg_${pregunta.id}`}
          className="text-sm sm:text-base font-medium text-stone-100 leading-snug"
        >
          {pregunta.pregunta}
          {pregunta.requerida && (
            <span className="text-rose-400 ml-1 font-bold" title="Campo obligatorio">*</span>
          )}
        </label>
        {pregunta.capturarFuente && (
          <button
            type="button"
            onClick={() => setMostrarFuente(!mostrarFuente)}
            className="text-[11px] sm:text-xs text-[#A57F2C] hover:text-amber-200 underline flex items-center gap-1 shrink-0"
          >
            <Bookmark className="w-3 h-3" />
            {mostrarFuente ? 'Ocultar fuente' : 'Capturar fuente'}
          </button>
        )}
      </div>

      {pregunta.instruccion && (
        <p className="text-xs text-stone-300 italic bg-black/20 p-2 rounded border-l-2 border-[#A57F2C]">
          {pregunta.instruccion}
        </p>
      )}

      <div className="relative max-w-xl">
        <select
          id={`preg_${pregunta.id}`}
          value={valor || ''}
          onChange={(e) => onChange(e.target.value, fuente)}
          className={`animated-select animated-select--custom-icon w-full appearance-none px-3.5 py-2.5 rounded-lg glass-input text-sm text-stone-100 cursor-pointer pr-10 ${
            error ? 'border-rose-500 focus:border-rose-400' : ''
          }`}
        >
          <option value="" disabled className="bg-[#002F2A] text-stone-400">
            Seleccione una opción ▾
          </option>
          {(pregunta.opciones || []).map((opc, i) => (
            <option
              key={i}
              value={opc}
              disabled={opc === 'Seleccione una opción'}
              className="bg-[#002F2A] text-stone-100 py-1"
            >
              {opc}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#A57F2C]">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>

      {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}

      {pregunta.capturarFuente && mostrarFuente && (
        <div className="mt-2 p-2.5 rounded-md bg-[#611232]/30 border border-[#A57F2C]/30 space-y-1">
          <label className="text-xs font-semibold text-[#A57F2C] flex items-center gap-1">
            <Bookmark className="w-3 h-3" /> Fuente documental / normativa:
          </label>
          <input
            type="text"
            maxLength={max}
            value={fuente || ''}
            onChange={(e) => onChange(valor, e.target.value.substring(0, max))}
            placeholder="Especifique documento, numeral, artículo, enlace o fecha..."
            className="w-full px-2.5 py-1.5 rounded glass-input text-xs text-stone-200"
          />
          <div className="text-right text-[10px] text-stone-400">
            {(fuente || '').length} / {max}
          </div>
        </div>
      )}
    </div>
  );
};
