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
  AlertCircle,
  Activity,
  Eye,
  EyeOff,
  Layers,
  Lock,
  Pencil,
  Send,
  Unlock,
} from 'lucide-react';

interface FormSectionViewProps {
  seccion: SeccionConfig;
  respuestas: Record<string, RespuestaItem>;
  clavePrograma: string;
  anioPrograma: string;
  claveBloqueada: boolean;
  isSubmitted: boolean;
  onToggleClaveBloqueada: () => void;
  onClaveProgramaChange: (valor: string) => void;
  onAnioProgramaChange: (valor: string) => void;
  onRespuestaChange: (preguntaId: string, seccionId: string, pregunta: string, valor: any, fuente?: string) => void;
  onSubmitSection: () => void;
}

export const FormSectionView: React.FC<FormSectionViewProps> = ({
  seccion,
  respuestas,
  clavePrograma,
  anioPrograma,
  claveBloqueada,
  isSubmitted,
  onToggleClaveBloqueada,
  onClaveProgramaChange,
  onAnioProgramaChange,
  onRespuestaChange,
  onSubmitSection,
}) => {
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [mostrarAlerta, setMostrarAlerta] = useState(false);
  const [mostrarRespondidas, setMostrarRespondidas] = useState(false);
  const [mostrarResumen, setMostrarResumen] = useState(false);
  const [preguntaEnEdicion, setPreguntaEnEdicion] = useState<string | null>(null);

  useEffect(() => {
    setErrores({});
    setMostrarAlerta(false);
    setMostrarRespondidas(false);
    setPreguntaEnEdicion(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [seccion.id]);

  const isQuestionVisible = (pregunta: PreguntaConfig): boolean => {
    if (!pregunta.dependeDe) return true;
    const parentResponse = respuestas[pregunta.dependeDe.preguntaId]?.valor;

    if (Array.isArray(pregunta.dependeDe.valor)) {
      if (Array.isArray(parentResponse)) {
        return pregunta.dependeDe.valor.some((valor) => parentResponse.includes(valor));
      }
      return pregunta.dependeDe.valor.includes(parentResponse);
    }

    if (Array.isArray(parentResponse)) {
      return parentResponse.includes(pregunta.dependeDe.valor);
    }

    return parentResponse === pregunta.dependeDe.valor;
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

  const mostrarRespuestaS313 = (preguntaId: string): boolean =>
    respuestas['clave_programa']?.valor === 'S313' && ['10', '11', '12', '13', '14', '15', '16'].includes(preguntaId);

  const preguntasVisibles = seccion.preguntas.filter(isQuestionVisible);
  const respondidas = preguntasVisibles.filter(isQuestionAnswered);
  const preguntasRequeridas = preguntasVisibles.filter((pregunta) => pregunta.requerida);
  const seccionCompleta = preguntasRequeridas.length > 0 && preguntasRequeridas.every(isQuestionAnswered);

  useEffect(() => {
    setMostrarResumen(isSubmitted || seccionCompleta);
  }, [seccion.id, isSubmitted, seccionCompleta]);

  const formatSummaryValue = (value: unknown): string => {
    if (value === null || value === undefined || value === '') return '—';
    if (Array.isArray(value)) return value.map(String).join(', ');
    if (typeof value === 'object') {
      return Object.entries(value).map(([key, item]) => `${key}: ${String(item ?? '—')}`).join(' · ');
    }
    return String(value);
  };

  const preguntasMostradas = mostrarRespondidas
    ? preguntasVisibles
    : preguntasVisibles.filter((pregunta) => {
        const esRespuestaEnEdicion = ['texto_corto', 'texto_largo', 'numero', 'grilla_cuantificacion'].includes(pregunta.tipo)
          && preguntaEnEdicion === pregunta.id;
        return !isQuestionAnswered(pregunta) || esRespuestaEnEdicion || mostrarRespuestaS313(pregunta.id);
      });

  const renderQuestion = (preg: PreguntaConfig) => {
    if (!isQuestionVisible(preg)) return null;

    if (!mostrarRespondidas && isQuestionAnswered(preg)) {
      const esRespuestaEnEdicion = ['texto_corto', 'texto_largo', 'numero', 'grilla_cuantificacion'].includes(preg.tipo)
        && preguntaEnEdicion === preg.id;
      if (!esRespuestaEnEdicion && !mostrarRespuestaS313(preg.id)) return null;
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
                  readOnly={clavePrograma === 'S313' && ['10', '11'].includes(preg.id)}
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
        <div className="glass-form-surface rounded-2xl border border-slate-900/15 p-4 shadow-xl sm:p-5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <label htmlFor="clave-programa" className="block text-sm font-semibold text-black">
              Clave del programa
            </label>
            {clavePrograma && (
              <button
                type="button"
                onClick={onToggleClaveBloqueada}
                aria-pressed={!claveBloqueada}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-900/20 px-2.5 py-1.5 text-xs font-medium text-black transition hover:bg-[#A57F2A]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A57F2C]"
                title={claveBloqueada ? 'Desbloquear la clave para cambiarla' : 'Bloquear la clave actual'}
              >
                {claveBloqueada ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                {claveBloqueada ? 'Desbloquear clave' : 'Bloquear clave'}
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="clave-programa" className="mb-1.5 block text-xs font-medium text-black">
                Clave del programa
              </label>
              <select
                id="clave-programa"
                value={clavePrograma}
                disabled={claveBloqueada && Boolean(clavePrograma)}
                onChange={(event) => onClaveProgramaChange(event.target.value)}
                className="animated-select w-full rounded-lg border border-[#A57F2C]/50 bg-[#002F2A] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#A57F2C] focus:ring-2 focus:ring-[#A57F2C]/30 disabled:cursor-not-allowed"
              >
                <option value="">Selecciona una clave</option>
                {['S313', 'E001', 'U013', 'S200', 'U313', 'E003', 'E004', 'E006'].map((clave) => (
                  <option key={clave} value={clave}>{clave}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="anio-programa" className="mb-1.5 block text-xs font-medium text-black">
                Año del programa
              </label>
              <select
                id="anio-programa"
                value={anioPrograma}
                onChange={(event) => onAnioProgramaChange(event.target.value)}
                className="animated-select w-full rounded-lg border border-[#A57F2C]/50 bg-[#002F2A] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#A57F2C] focus:ring-2 focus:ring-[#A57F2C]/30"
              >
                <option value="">Selecciona un año</option>
                <option value="2024">2024</option>
                <option value="2025">2025</option>
              </select>
            </div>
          </div>
        </div>

        {/* Encabezado de la Sección - Card Transparente y Limpia */}
        <div className="glass-institutional rounded-2xl p-5 sm:p-7 border border-[#A57F2C]/30 shadow-xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="px-3 py-1 rounded-full bg-[#611232] text-[#A57F2C] text-xs font-bold uppercase tracking-wider border border-[#A57F2C]/40">
              SECCIÓN {seccion.numero} DE 6
            </span>
            {seccion.temaPresupuesto && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-black text-xs font-medium">
                <Activity className="w-3.5 h-3.5 text-[#A57F2C]" />
                <span className="truncate max-w-[280px] sm:max-w-md">{seccion.temaPresupuesto}</span>
              </span>
            )}
          </div>

          <h2 className="text-lg sm:text-xl md:text-2xl font-sans font-semibold tracking-tight text-black">
            {seccion.titulo}
          </h2>

          {seccion.subtitulo && (
            <p className="text-xs sm:text-sm text-black font-semibold">
              {seccion.subtitulo}
            </p>
          )}

          {seccion.descripcion && (
            <p className="text-xs text-black/90 pt-1 border-t border-[#A57F2C]/20 leading-relaxed">
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

        {mostrarResumen ? (
          <section className="glass-form-surface space-y-4 rounded-xl border border-slate-900/15 p-4 shadow-lg sm:p-6">
            <h3 className="text-base font-semibold text-black">
              {isSubmitted ? 'Información enviada' : 'Resumen de la sección'}
            </h3>
            <dl className="space-y-3">
              {preguntasVisibles.filter(isQuestionAnswered).map((pregunta) => {
                const respuesta = respuestas[pregunta.id];
                return (
                  <div key={pregunta.id} className="border-b border-slate-900/10 pb-3 last:border-0">
                    <dt className="text-xs font-semibold text-black">{pregunta.pregunta}</dt>
                    <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                      {formatSummaryValue(respuesta?.valor)}
                    </dd>
                    {respuesta?.fuente && (
                      <dd className="mt-1 text-xs text-slate-600">Fuente: {respuesta.fuente}</dd>
                    )}
                  </div>
                );
              })}
            </dl>
            {!isSubmitted && (
              <div className="flex flex-col justify-end gap-2 border-t border-slate-900/10 pt-4 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setMostrarResumen(false)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-900/20 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-black/5"
                >
                  <Pencil className="h-4 w-4" />
                  Editar sección
                </button>
                <button
                  type="button"
                  onClick={onSubmitSection}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#003d35] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#002f2a]"
                >
                  <Send className="h-4 w-4" />
                  Enviar información
                </button>
              </div>
            )}
          </section>
        ) : (
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
              if (preg.subseccion) lastSubseccion = preg.subseccion;
              return (
                <React.Fragment key={preg.id}>
                  {isNewSubseccion && (
                    <div className="pt-3 pb-1">
                      <div className="inline-flex items-center gap-2 text-black text-xs font-bold uppercase tracking-wider">
                        <Layers className="h-3.5 w-3.5 text-black" />
                        <span>{preg.subseccion}</span>
                      </div>
                    </div>
                  )}
                  {renderQuestion(preg)}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
