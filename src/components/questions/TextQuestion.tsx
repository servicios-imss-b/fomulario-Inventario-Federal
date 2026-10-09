import React from 'react';
import { PreguntaConfig } from '../../types/form';
import { Bookmark, ExternalLink } from 'lucide-react';

interface TextQuestionProps {
  pregunta: PreguntaConfig;
  valor: string;
  fuente?: string;
  error?: string;
  onChange: (valor: string, fuente?: string) => void;
}

export const TextQuestion: React.FC<TextQuestionProps> = ({
  pregunta,
  valor = '',
  fuente = '',
  error,
  onChange,
}) => {
  const max = pregunta.maxCaracteres || 300;
  const charsUsed = (valor || '').length;
  const isAtLimit = charsUsed >= max;
  const enlaceOficial = pregunta.id === '13' && /^https?:\/\/\S+$/i.test(valor.trim())
    ? valor.trim()
    : '';

  const [mostrarFuente, setMostrarFuente] = React.useState(Boolean(fuente));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        <input
          id={`preg_${pregunta.id}`}
          type="text"
          maxLength={max}
          value={valor || ''}
          onChange={handleChange}
          placeholder={pregunta.placeholder || 'Escriba su respuesta aquí...'}
          className={`w-full px-3.5 py-2.5 rounded-lg glass-input text-sm text-stone-100 placeholder:text-stone-400 ${
            error ? 'border-rose-500 focus:border-rose-400 focus:ring-rose-500/20' : ''
          }`}
        />
        <div className="mt-1 flex items-center justify-between px-1 text-[10px] text-black sm:text-[11px]">
          <span className="text-black">
            {error ? <span className="text-rose-400 font-medium">{error}</span> : 'Límite de caracteres'}
          </span>
          <span
            className={`font-mono font-medium text-black ${isAtLimit ? 'font-bold' : ''}`}
          >
            {charsUsed} / {max}
          </span>
        </div>
        {enlaceOficial && (
          <a
            href={enlaceOficial}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#A57F2C] underline underline-offset-2 hover:text-amber-200"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            Abrir documento oficial
          </a>
        )}
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
          <div className="text-right text-[10px] text-stone-400">
            {(fuente || '').length} / {max}
          </div>
        </div>
      )}
    </div>
  );
};
