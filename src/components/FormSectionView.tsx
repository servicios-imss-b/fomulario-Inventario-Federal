import React, { useState, useEffect } from 'react';
import { SeccionConfig, PreguntaConfig, RespuestaItem } from '../types/form';
import { TextQuestion } from './questions/TextQuestion';
import { LongTextQuestion } from './questions/LongTextQuestion';
import { NumberQuestion } from './questions/NumberQuestion';
import { SelectQuestion } from './questions/SelectQuestion';
import { MultiSelectQuestion } from './questions/MultiSelectQuestion';
import { RadioQuestion } from './questions/RadioQuestion';
import { DateQuestion } from './questions/DateQuestion';
import { GridQuantificationQuestion } from './questions/GridQuantificationQuestion';
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Activity,
  Eye,
  EyeOff,
  Layers,
} from 'lucide-react';

interface FormSectionViewProps {
  seccion: SeccionConfig;
  respuestas: Record<string, RespuestaItem>;
  isFirstSection: boolean;
  isLastQuestionSection: boolean;
  onRespuestaChange: (preguntaId: string, seccionId: string, pregunta: string, valor: any, fuente?: string) => void;
  onNext: () => void;
  onPrev: () => void;
}

export const FormSectionView: React.FC<FormSectionViewProps> = ({
  seccion,
  respuestas,
  isFirstSection,
  isLastQuestionSection,
  onRespuestaChange,
  onNext,
  onPrev,
}) => {
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [mostrarAlerta, setMostrarAlerta] = useState(false);
  const [mostrarRespondidas, setMostrarRespondidas] = useState(false);
  const [preguntaEnEdicion, setPreguntaEnEdicion] = useState<string | null>(null);

  // Clear errors when section changes
  useEffect(() => {
    setErrores({});
    setMostrarAlerta(false);
    setMostrarRespondidas(false);
    setPreguntaEnEdicion(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [seccion.id]);

  // Check if a question's dependency condition is met
  const isQuestionVisible = (pregunta: PreguntaConfig): boolean => {
    if (!pregunta.dependeDe) return true;
    const parentResponse = respuestas[pregunta.dependeDe.preguntaId]?.valor;

    if (Array.isArray(pregunta.dependeDe.valor)) {
      if (Array.isArray(parentResponse)) {
        return pregunta.dependeDe.valor.some((v) => parentResponse.includes(v));
      }
      return pregunta.dependeDe.valor.includes(parentResponse);
    }

    if (Array.isArray(parentResponse)) {
      return parentResponse.includes(pregunta.dependeDe.valor);
    }

    return parentResponse === pregunta.dependeDe.valor;
  };

  const handleValidateAndNext = () => {
    setErrores({});
    setMostrarAlerta(false);
    onNext();
  };

  const isQuestionAnswered = (pregunta: PreguntaConfig): boolean => {
    const valor = respuestas[pregunta.id]?.valor;
    if (valor === undefined || valor === null || valor === '') return false;

    if (pregunta.tipo === 'multiple') {
      return Array.isArray(valor) && valor.length > 0;
    }

    if (pregunta.tipo === 'grilla_cuantificacion') {
      if (typeof valor !== 'object' || !valor.entidad || valor.total === '' || valor.total == null) {
        return false;
      }
      const formaReporte = respuestas['37']?.valor || 'Agregada';
      return formaReporte !== 'Desagregada por sexo' ||
        (valor.mujeres !== '' && valor.mujeres != null && valor.hombres !== '' && valor.hombres != null);
    }

    if (pregunta.tipo === 'select') {
      return typeof valor === 'string' && !valor.toLowerCase().startsWith('seleccione');
    }

    if (pregunta.tipo === 'numero') {
      return valor !== '';
    }

    if (typeof valor === 'string') return valor.trim().length > 0;
    if (Array.isArray(valor)) return valor.length > 0;
    return Boolean(valor);
  };

  const preguntasVisibles = seccion.preguntas.filter(isQuestionVisible);
  const respondidas = preguntasVisibles.filter(isQuestionAnswered);
  const preguntasMostradas = mostrarRespondidas
    ? preguntasVisibles
    : preguntasVisibles.filter((pregunta) => {
        const esRespuestaEnEdicion = ['texto_corto', 'texto_largo', 'numero', 'grilla_cuantificacion'].includes(pregunta.tipo)
          && preguntaEnEdicion === pregunta.id;
        return !isQuestionAnswered(pregunta) || esRespuestaEnEdicion;
      });

  const renderQuestion = (preg: PreguntaConfig) => {
    if (!isQuestionVisible(preg)) return null;

    if (!mostrarRespondidas && isQuestionAnswered(preg)) {
      const esRespuestaEnEdicion = ['texto_corto', 'texto_largo', 'numero', 'grilla_cuantificacion'].includes(preg.tipo)
        && preguntaEnEdicion === preg.id;
      if (!esRespuestaEnEdicion) return null;
    }

    const currentResp = respuestas[preg.id];
    const valor = currentResp ? currentResp.valor : '';
    const fuente = currentResp ? currentResp.fuente : '';
    const error = errores[preg.id];

    const isGuindaCard = preg.id === '20' || preg.id === '24' || preg.id === '30' || preg.id === '35';

    return (
      <div
        key={preg.id}
        onFocusCapture={() => {
          if (['texto_corto', 'texto_largo', 'numero', 'grilla_cuantificacion'].includes(preg.tipo)) {
            setPreguntaEnEdicion(preg.id);
          }
        }}
        onBlurCapture={(event) => {
          const card = event.currentTarget;
          window.setTimeout(() => {
            if (!card.contains(document.activeElement)) {
              setPreguntaEnEdicion((actual) => actual === preg.id ? null : actual);
            }
          }, 0);
        }}
        className={`p-4 sm:p-6 rounded-xl transition-all duration-200 border ${
          isGuindaCard ? 'glass-card-guinda' : 'glass-card'
        } ${error ? 'border-rose-500/80 ring-1 ring-rose-500/40' : 'hover:border-[#A57F2C]/50'}`}
      >
        {(() => {
          switch (preg.tipo) {
            case 'texto_corto':
              return (
                <TextQuestion
                  pregunta={preg}
                  valor={valor}
                  fuente={fuente}
                  error={error}
                  onChange={(val, f) => onRespuestaChange(preg.id, seccion.id, preg.pregunta, val, f)}
                />
              );
            case 'texto_largo':
              return (
                <LongTextQuestion
                  pregunta={preg}
                  valor={valor}
                  fuente={fuente}
                  error={error}
                  onChange={(val, f) => onRespuestaChange(preg.id, seccion.id, preg.pregunta, val, f)}
                />
              );
            case 'numero':
              return (
                <NumberQuestion
                  pregunta={preg}
                  valor={valor}
                  error={error}
                  onChange={(val) => onRespuestaChange(preg.id, seccion.id, preg.pregunta, val)}
                />
              );
            case 'select':
              return (
                <SelectQuestion
                  pregunta={preg}
                  valor={valor}
                  fuente={fuente}
                  error={error}
                  onChange={(val, f) => onRespuestaChange(preg.id, seccion.id, preg.pregunta, val, f)}
                />
              );
            case 'multiple':
              return (
                <MultiSelectQuestion
                  pregunta={preg}
                  valor={valor}
                  error={error}
                  onChange={(val) => onRespuestaChange(preg.id, seccion.id, preg.pregunta, val)}
                />
              );
            case 'radio':
              return (
                <RadioQuestion
                  pregunta={preg}
                  valor={valor}
                  error={error}
                  onChange={(val) => onRespuestaChange(preg.id, seccion.id, preg.pregunta, val)}
                />
              );
            case 'fecha':
              return (
                <DateQuestion
                  pregunta={preg}
                  valor={valor}
                  error={error}
                  onChange={(val) => onRespuestaChange(preg.id, seccion.id, preg.pregunta, val)}
                />
              );
            case 'grilla_cuantificacion':
              const formaReporte = respuestas['37']?.valor || 'Agregada';
              return (
                <GridQuantificationQuestion
                  pregunta={preg}
                  valor={valor}
                  formaReporte={formaReporte}
                  error={error}
                  onChange={(val) => onRespuestaChange(preg.id, seccion.id, preg.pregunta, val)}
                />
              );
            default:
              return null;
          }
        })()}
      </div>
    );
  };

  // Agrupamiento visual por subsección
  let lastSubseccion = '';

  return (
    <div className="relative min-h-[calc(100vh-8rem)] py-6 sm:py-8 px-4 sm:px-6 max-w-4xl mx-auto flex flex-col justify-between z-10">
      <div className="space-y-6">
        {/* Encabezado de la Sección - Card Transparente y Limpia */}
        <div className="glass-institutional rounded-2xl p-5 sm:p-7 border border-[#A57F2C]/30 shadow-xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="px-3 py-1 rounded-full bg-[#611232] text-[#A57F2C] text-xs font-bold uppercase tracking-wider border border-[#A57F2C]/40">
              SECCIÓN {seccion.numero} DE 6
            </span>
            {seccion.temaPresupuesto && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#002F2A] border border-[#A57F2C]/40 text-stone-200 text-xs font-medium">
                <Activity className="w-3.5 h-3.5 text-[#A57F2C]" />
                <span className="truncate max-w-[280px] sm:max-w-md">{seccion.temaPresupuesto}</span>
              </span>
            )}
          </div>

          <h2 className="text-lg sm:text-xl md:text-2xl font-sans font-semibold tracking-tight text-stone-100">
            {seccion.titulo}
          </h2>

          {seccion.subtitulo && (
            <p className="text-xs sm:text-sm text-[#A57F2C] font-semibold">
              {seccion.subtitulo}
            </p>
          )}

          {seccion.descripcion && (
            <p className="text-xs text-stone-300 pt-1 border-t border-[#A57F2C]/20 leading-relaxed">
              {seccion.descripcion}
            </p>
          )}
        </div>

        {/* Alerta de validación */}
        {mostrarAlerta && (
          <div className="p-4 rounded-xl bg-rose-950/90 border border-rose-500/60 text-rose-200 flex items-start gap-3 shadow-lg">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm">
              <p className="font-semibold">Completa las preguntas obligatorias antes de continuar.</p>
              <p className="text-rose-300/80 mt-0.5">
                Revise las preguntas marcadas en rojo para garantizar la integridad técnica del registro.
              </p>
            </div>
          </div>
        )}

        {/* Lista de preguntas agrupadas por subsección */}
        <div className="space-y-4">
          {respondidas.length > 0 && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setMostrarRespondidas((actual) => !actual)}
                aria-expanded={mostrarRespondidas}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#A57F2C]/40 px-3 py-1.5 text-xs font-medium text-stone-200 transition hover:bg-[#A57F2C]/15"
              >
                {mostrarRespondidas ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {mostrarRespondidas ? 'Ocultar preguntas respondidas' : 'Ver preguntas respondidas'}
              </button>
            </div>
          )}

          {preguntasMostradas.map((preg) => {
            const isNewSubseccion = preg.subseccion && preg.subseccion !== lastSubseccion;
            if (preg.subseccion) {
              lastSubseccion = preg.subseccion;
            }

            return (
              <React.Fragment key={preg.id}>
                {isNewSubseccion && (
                  <div className="pt-3 pb-1">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#002F2A]/55 backdrop-blur-md border border-[#A57F2C]/40 text-[#A57F2C] text-xs font-bold uppercase tracking-wider shadow-sm">
                      <Layers className="w-3.5 h-3.5 text-[#A57F2C]" />
                      <span>{preg.subseccion}</span>
                    </div>
                  </div>
                )}
                {renderQuestion(preg)}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Barra de navegación inferior - Botones sólidos modernos SIN DEGRADADOS */}
      <div className="mt-8 pt-6 border-t border-[#A57F2C]/30 flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
        <button
          type="button"
          onClick={onPrev}
          className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs sm:text-sm font-semibold text-stone-200 hover:text-white bg-[#002F2A] hover:bg-[#02433c] border border-[#A57F2C]/40 flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>← ANTERIOR</span>
        </button>

        <button
          type="button"
          onClick={handleValidateAndNext}
          className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-xs sm:text-sm font-bold text-[#002F2A] bg-[#A57F2C] hover:bg-[#c4993a] border border-[#A57F2C] shadow-lg flex items-center justify-center gap-2 transition hover:scale-[1.02] cursor-pointer"
        >
          <span>
            {isLastQuestionSection ? 'CONTINUAR A ARCHIVOS ADJUNTOS →' : 'SIGUIENTE SECCIÓN →'}
          </span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
