import React from 'react';
import { PreguntaConfig } from '../../types/form';
import { Bookmark } from 'lucide-react';

interface LongTextQuestionProps {
  pregunta: PreguntaConfig;
  valor: string;
  fuente?: string;
  error?: string;
  readOnly?: boolean;
  onChange: (valor: string, fuente?: string) => void;
}

export const LongTextQuestion: React.FC<LongTextQuestionProps> = ({
  pregunta,
  valor = '',
  fuente = '',
  error,
  readOnly = false,
  onChange,
}) => {
  const max = pregunta.maxCaracteres || 300;
  const charsUsed = (valor || '').length;
  const isAtLimit = charsUsed >= max;

  const [mostrarFuente, setMostrarFuente] = React.useState(Boolean(fuente));

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let newVal = e.target.value;
    if (newVal.length > max) {
      newVal = newVal.substring(0, max);
    }
    onChange(newVal, fuente);
  };

  const handleFuenteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newFuente = e.target.value;
    if (newFuente.length > max) {
      newFuente = newFuente.substring(0, max);
    }
    onChange(valor, newFuente);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <label
          htmlFor={`preg_${pregunta.id}`}
          className="text-sm sm:text-base font-medium text-black leading-snug"
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
        <p className="text-xs text-black/90 italic border-l-2 border-[#A57F2C] pl-2">
          {pregunta.instruccion}
        </p>
      )}

      <div className="relative">
        <textarea
          id={`preg_${pregunta.id}`}
          maxLength={max}
          rows={3}
          value={valor || ''}
          readOnly={readOnly}
          aria-readonly={readOnly}
          title={readOnly ? 'Respuesta fija para la clave S313' : undefined}
          onChange={handleChange}
          placeholder={pregunta.placeholder || 'Ingrese la descripción detallada aquí (máx. 300 caracteres)...'}
          className={`w-full px-3.5 py-2.5 rounded-lg glass-input text-sm text-stone-100 placeholder:text-stone-400 resize-y min-h-[90px] ${error ? 'border-rose-500 focus:border-rose-400 focus:ring-rose-500/20' : ''} ${readOnly ? 'read-only:cursor-not-allowed read-only:bg-black/40 read-only:text-stone-300 read-only:border-stone-500/40' : ''}`}
        />
        <div className="mt-1 flex items-center justify-between px-1 text-[10px] text-black sm:text-[11px]">
          <span className="text-black">
            {error ? <span className="text-rose-400 font-medium">{error}</span> : `Máximo ${max} caracteres`}
          </span>
          <span
            className={`font-mono font-medium text-black ${isAtLimit ? 'font-bold' : ''}`}
          >
            {charsUsed} / {max}
          </span>
        </div>
      </div>

      {pregunta.capturarFuente && mostrarFuente && (
        <div className="mt-2 p-2.5 rounded-md bg-[#611232]/30 border border-[#A57F2C]/30 space-y-1">
          <label className="text-xs font-semibold text-[#A57F2C] flex items-center gap-1">
            <Bookmark className="w-3 h-3" /> {pregunta.fuenteEtiqueta || 'Fuente documental / normativa:'}
          </label>
          <input
            type="text"
            maxLength={max}
            value={fuente || ''}
            onChange={handleFuenteChange}
            placeholder="Especifique documento, numeral, artículo, enlace o fecha..."
            className="w-full px-2.5 py-1.5 rounded glass-input text-xs text-stone-200"
          />
          <div className="px-1 text-right text-[10px] text-black">
            {(fuente || '').length} / {max}
          </div>
        </div>
      )}
    </div>
  );
};
