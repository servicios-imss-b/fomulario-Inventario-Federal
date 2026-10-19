import React, { useState, useEffect } from 'react';
import { SeccionConfig, PreguntaConfig, RespuestaItem } from '../types/form';
import { TextQuestion } from './questions/TextQuestion';
import { LongTextQuestion } from './questions/LongTextQuestion';
import { NumberQuestion } from './questions/NumberQuestion';
import { SelectQuestion } from './questions/SelectQuestion';
import { MultiSelectQuestion } from './questions/MultiSelectQuestion';
import { RadioQuestion } from './questions/RadioQuestion';
import { DateQuestion } from './questions/DateQuestion';
import { MatrixQuestion } from './questions/MatrixQuestion';
import { RepeatableQuantificationQuestion } from './questions/RepeatableQuantificationQuestion';
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Activity,
  CheckCircle2,
  Clock3,
  Layers,
  LoaderCircle,
  Pencil,
  RotateCcw,
} from 'lucide-react';

const CONTACT_EMAIL_QUESTION_IDS = new Set(['3', '9']);
const PERSONAL_EMAIL_EXCEPTION_QUESTION_IDS = new Set(['9']);
const PHONE_QUESTION_IDS = new Set(['4', '8']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INSTITUTIONAL_EMAIL_PATTERN = /^[^\s@]+@imssbienestar\.gob\.mx$/i;

interface FormSectionViewProps {
  seccion: SeccionConfig;
  respuestas: Record<string, RespuestaItem>;
  clavePrograma: string;
  anioPrograma: string;
  onClaveProgramaChange: (valor: string) => void;
  onAnioProgramaChange: (valor: string) => void;
  onResetProgramSelection: () => void;
  onSaveAndNext: (sectionComplete: boolean) => Promise<void>;
  onPreviousSection: () => void;
  onPrefillAgreement: (preguntaId: string, disagreed: boolean) => void;
  onRespuestaChange: (preguntaId: string, seccionId: string, pregunta: string, valor: any, fuente?: string, correoPersonalPorBaja?: boolean) => void;
}

export const FormSectionView: React.FC<FormSectionViewProps> = ({
  seccion,
  respuestas,
  clavePrograma,
  anioPrograma,
  onClaveProgramaChange,
  onAnioProgramaChange,
  onResetProgramSelection,
  onSaveAndNext,
  onPreviousSection,
  onPrefillAgreement,
  onRespuestaChange,
}) => {
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [mostrarAlerta, setMostrarAlerta] = useState(false);
  const [mostrarResumen, setMostrarResumen] = useState(false);
  const [guardandoSiguiente, setGuardandoSiguiente] = useState(false);
  const supportCount = seccion.id === 'apoyos_poblacion_atendida'
    ? Math.min(30, Math.max(1, Number(respuestas['__apoyos_count']?.valor ?? 1)))
    : 1;

  const preguntasDeSeccion = seccion.id === 'apoyos_poblacion_atendida'
    ? seccion.preguntas.flatMap((pregunta) => {
        const supportIdMatch = pregunta.id.match(/^(24|25|26|27|27\.1|28|28\.1|29|29\.1|30|31|32|33|34|35|35\.1|36|37|37\.1)$/);
        if (!supportIdMatch) return [pregunta];

        return Array.from({ length: supportCount }, (_, supportIndex) => {
          const suffix = `__apoyo_${supportIndex}`;
          const remapId = (id: string) => /^(24|25|26|27|27\.1|28|28\.1|29|29\.1|30|31|32|33|34|35|35\.1|36|37|37\.1)$/.test(id)
            ? `${id}${suffix}`
            : id;
          const supportName = String(respuestas[`24${suffix}`]?.valor ?? '').trim();
          return {
            ...pregunta,
            id: `${pregunta.id}${suffix}`,
            pregunta: pregunta.pregunta.replace('(nombre de apoyo)', supportName || `apoyo ${supportIndex + 1}`),
            subseccion: `Tipo de apoyo ${supportIndex + 1}: ${pregunta.subseccion ?? ''}`,
            dependeDe: pregunta.dependeDe
              ? { ...pregunta.dependeDe, preguntaId: remapId(pregunta.dependeDe.preguntaId) }
              : undefined,
            opcionesPorValor: pregunta.opcionesPorValor
              ? { ...pregunta.opcionesPorValor, preguntaId: remapId(pregunta.opcionesPorValor.preguntaId) }
              : undefined,
          };
        });
      })
    : seccion.preguntas;

  useEffect(() => {
    setErrores({});
    setMostrarAlerta(false);
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
    const respuesta = respuestas[pregunta.id];
    if (respuesta?.prellenada && !respuesta.prefillConfirmed) return false;

    const valor = respuesta?.valor;
    if (valor === undefined || valor === null || valor === '') return false;

    if (CONTACT_EMAIL_QUESTION_IDS.has(pregunta.id)) {
      const email = String(valor).trim();
      return EMAIL_PATTERN.test(email) && (
        INSTITUTIONAL_EMAIL_PATTERN.test(email)
        || (PERSONAL_EMAIL_EXCEPTION_QUESTION_IDS.has(pregunta.id) && Boolean(respuesta?.correoPersonalPorBaja))
      );
    }
    if (PHONE_QUESTION_IDS.has(pregunta.id)) {
      return String(valor).replace(/\D/g, '').length >= 10;
    }

    if (pregunta.tipo === 'multiple') {
      return Array.isArray(valor) && valor.length > 0;
    }

    if (pregunta.tipo === 'grilla_cuantificacion') {
      if (typeof valor !== 'object' || !valor.rows || typeof valor.rows !== 'object') return false;
      const supportSuffix = pregunta.id.match(/__apoyo_\d+$/)?.[0] ?? '';
      const formaReporte = respuestas[`37${supportSuffix}`]?.valor || 'Agregada';
      const enteredRows = Object.values(valor.rows as Record<string, { total?: string; hombres?: string; mujeres?: string }>)
        .filter((row) => [row.total, row.hombres, row.mujeres].some((cell) => cell !== undefined && cell !== ''));
      if (enteredRows.length === 0) return false;
      return enteredRows.every((row) => formaReporte === 'Desagregada por sexo'
        ? row.hombres !== undefined && row.hombres !== '' && row.mujeres !== undefined && row.mujeres !== ''
        : row.total !== undefined && row.total !== '');
    }

    if (pregunta.tipo === 'tabla_cuantificacion') {
      const rows = (valor as { rows?: Array<{ unit: string; quantity: string; justification?: string }> })?.rows;
      return Boolean(rows?.length && rows.every((row) =>
        row.unit.trim()
        && row.quantity !== ''
        && Number(row.quantity) >= 0
        && (pregunta.id !== '18' || Number(row.quantity) !== 0 || Boolean(row.justification?.trim()))
      ));
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

  const getQuestionValidationMessage = (pregunta: PreguntaConfig): string => {
    const respuesta = respuestas[pregunta.id];
    if (respuesta?.prellenada && !respuesta.prefillConfirmed) {
      return 'Confirma la respuesta prellenada o elige «No, corregir» y registra la corrección.';
    }

    if (CONTACT_EMAIL_QUESTION_IDS.has(pregunta.id)) {
      const email = String(respuesta?.valor ?? '').trim();
      if (!email) return 'Esta pregunta es obligatoria.';
      if (!EMAIL_PATTERN.test(email)) return 'Ingresa un correo electrónico válido.';
      if (!INSTITUTIONAL_EMAIL_PATTERN.test(email)
        && !(PERSONAL_EMAIL_EXCEPTION_QUESTION_IDS.has(pregunta.id) && respuesta?.correoPersonalPorBaja)) {
        return PERSONAL_EMAIL_EXCEPTION_QUESTION_IDS.has(pregunta.id)
          ? 'Usa @imssbienestar.gob.mx o marca la excepción por baja institucional.'
          : 'Usa un correo institucional @imssbienestar.gob.mx.';
      }
    }
    if (PHONE_QUESTION_IDS.has(pregunta.id)) {
      const digitCount = String(respuesta?.valor ?? '').replace(/\D/g, '').length;
      if (digitCount < 10) return 'Capture al menos 10 dígitos, incluida la clave LADA.';
    }
    if (pregunta.id === '18') {
      const rows = (respuesta?.valor as { rows?: Array<{ quantity: string; justification?: string }> } | undefined)?.rows ?? [];
      if (rows.some((row) => row.quantity !== '' && Number(row.quantity) === 0 && !row.justification?.trim())) {
        return 'Justifique por qué la cuantificación de la población objetivo es cero.';
      }
    }

    return 'Esta pregunta es obligatoria.';
  };

  const preguntasVisibles = preguntasDeSeccion.filter(isQuestionVisible);
  const preguntasRequeridas = preguntasVisibles.filter((pregunta) => pregunta.requerida);
  const seccionCompleta = preguntasRequeridas.length > 0 && preguntasRequeridas.every(isQuestionAnswered);

  useEffect(() => {
    setMostrarResumen(seccionCompleta);
    if (seccionCompleta) {
      setErrores({});
      setMostrarAlerta(false);
    }
  }, [seccion.id, seccionCompleta]);

  const guardarYSiguiente = async () => {
    if (guardandoSiguiente) return;
    const preguntasFaltantes = preguntasRequeridas.filter((pregunta) => !isQuestionAnswered(pregunta));
    if (preguntasFaltantes.length > 0) {
      setErrores(Object.fromEntries(preguntasFaltantes.map((pregunta) => [pregunta.id, getQuestionValidationMessage(pregunta)])));
      setMostrarAlerta(true);
      return;
    }

    setErrores({});
    setMostrarAlerta(false);
    setGuardandoSiguiente(true);
    try {
      await onSaveAndNext(seccionCompleta);
    } finally {
      setGuardandoSiguiente(false);
    }
  };

  const formatSummaryValue = (value: unknown): string => {
    if (value === null || value === undefined || value === '') return '—';
    if (Array.isArray(value)) return value.map(formatSummaryValue).join(', ');
    if (typeof value === 'object') {
      if ('rows' in value && value.rows && typeof value.rows === 'object') {
        const rows = Object.entries(value.rows as Record<string, { total?: string; hombres?: string; mujeres?: string }>)
          .filter(([, row]) => [row.total, row.hombres, row.mujeres].some((cell) => cell !== undefined && cell !== ''));
        return `${rows.length} filas capturadas`;
      }
      return Object.entries(value).map(([key, item]) => `${key}: ${String(item ?? '—')}`).join(' · ');
    }
    return String(value);
  };

  const preguntasMostradas = preguntasVisibles;

  const renderQuestion = (preg: PreguntaConfig) => {
    if (!isQuestionVisible(preg)) return null;

    const currentResp = respuestas[preg.id];
    const valor = currentResp ? currentResp.valor : '';
    const fuente = currentResp ? currentResp.fuente : '';
    const isContactEmail = CONTACT_EMAIL_QUESTION_IDS.has(preg.id);
    const isContactPhone = PHONE_QUESTION_IDS.has(preg.id);
    const emailValue = typeof valor === 'string' ? valor.trim() : '';
    const formatError = isContactEmail && emailValue
      ? !EMAIL_PATTERN.test(emailValue)
        ? 'Ingresa un correo electrónico válido.'
        : !INSTITUTIONAL_EMAIL_PATTERN.test(emailValue)
          && !(PERSONAL_EMAIL_EXCEPTION_QUESTION_IDS.has(preg.id) && currentResp?.correoPersonalPorBaja)
          ? PERSONAL_EMAIL_EXCEPTION_QUESTION_IDS.has(preg.id)
            ? 'Usa @imssbienestar.gob.mx o marca la excepción por baja institucional.'
            : 'Usa un correo institucional @imssbienestar.gob.mx.'
          : undefined
      : undefined;
    const phoneDigitCount = String(valor ?? '').replace(/\D/g, '').length;
    const phoneError = isContactPhone && phoneDigitCount > 0 && phoneDigitCount < 10
      ? 'Capture al menos 10 dígitos, incluida la clave LADA.'
      : undefined;
    const error = formatError ?? phoneError ?? (isQuestionAnswered(preg) ? undefined : errores[preg.id]);
    const prefillConfirmed = Boolean(currentResp?.prefillConfirmed);
    const isGuindaCard = preg.id === '20' || preg.id === '24' || preg.id === '30' || preg.id === '35';

    return (
      <div
        key={preg.id}
        className={`p-4 sm:p-6 rounded-xl transition-all duration-200 border ${
          isGuindaCard ? 'glass-card-guinda' : 'glass-card'
        } ${error ? 'border-rose-500/80 ring-1 ring-rose-500/40' : 'hover:border-[#A57F2C]/50'}`}
      >
        {currentResp?.prellenada && (
          <div className="light-question-note mb-3 space-y-3 rounded-md border-l-2 border-[#A57F2C] bg-white/70 px-3 py-2 text-xs text-black">
            {currentResp.notaPrellenado && <p className="whitespace-pre-line leading-relaxed">{currentResp.notaPrellenado}</p>}
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label={`Confirmar respuesta precargada para ${preg.pregunta}`}>
              <span className="font-semibold">¿Está de acuerdo con esta respuesta?</span>
              <button
                type="button"
                aria-pressed={prefillConfirmed && !currentResp.prefillDisagreed}
                onClick={() => onPrefillAgreement(preg.id, false)}
                className={`rounded-md border px-3 py-1.5 font-medium transition-colors ${prefillConfirmed && !currentResp.prefillDisagreed ? 'border-emerald-700 bg-emerald-800 text-white' : 'border-slate-900/20 bg-white text-slate-800 hover:bg-emerald-50'}`}
              >
                De acuerdo
              </button>
              <button
                type="button"
                aria-pressed={Boolean(currentResp.prefillDisagreed)}
                onClick={() => onPrefillAgreement(preg.id, true)}
                className={`rounded-md border px-3 py-1.5 font-medium transition-colors ${currentResp.prefillDisagreed ? 'border-[#611232] bg-[#611232] text-white' : 'border-slate-900/20 bg-white text-slate-800 hover:bg-rose-50'}`}
              >
                No, corregir
              </button>
              {prefillConfirmed ? (
                <span className="flex items-center gap-1 font-semibold text-emerald-800" role="status">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {currentResp.prefillDisagreed ? 'Corrección validada' : 'Respuesta validada'}
                </span>
              ) : currentResp.prefillDisagreed ? (
                <span className="font-medium text-[#611232]">Edita la respuesta para confirmar la corrección.</span>
              ) : (
                <span className="flex items-center gap-1 font-medium text-amber-800" role="status">
                  <Clock3 className="h-3.5 w-3.5" />
                  Pendiente de validar
                </span>
              )}
            </div>
          </div>
        )}
        {preg.avisoAntes && (!preg.id.includes('__apoyo_') || preg.id.endsWith('__apoyo_0')) && (
          <div className="light-question-note mb-4 whitespace-pre-line rounded-lg border-l-4 border-[#A57F2C] bg-white/70 p-3 text-xs leading-relaxed text-black">
            {preg.avisoAntes}
          </div>
        )}
        <fieldset disabled={Boolean(currentResp?.prellenada && !currentResp.prefillDisagreed) && preg.tipo !== 'tabla_cuantificacion'} className="min-w-0">
        {(() => {
          switch (preg.tipo) {
            case 'texto_corto':
              return (
                <TextQuestion
                  pregunta={preg}
                  valor={valor}
                  fuente={fuente}
                  correoPersonalPorBaja={Boolean(currentResp?.correoPersonalPorBaja)}
                  error={error}
                  onChange={(val, f, personalPorBaja) => onRespuestaChange(preg.id, seccion.id, preg.pregunta, val, f, personalPorBaja)}
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
              const dynamicOptions = preg.opcionesPorValor
                ? preg.opcionesPorValor.opciones[String(respuestas[preg.opcionesPorValor.preguntaId]?.valor ?? '')] ?? ['Seleccione una opción']
                : preg.opciones;
              const baseQuestionId = preg.id.replace(/__apoyo_\d+$/, '');
              const mirLevelFour = dynamicOptions?.find((option) => option.startsWith('4. '));
              const selectedValue = baseQuestionId === '31' && String(valor).trim() === '4'
                ? mirLevelFour ?? '4. Proyectos de mejora de las Unidades de Salud de Primer Nivel de Atención concluidos'
                : valor;
              return (
                <SelectQuestion
                  pregunta={{ ...preg, opciones: dynamicOptions }}
                  valor={selectedValue}
                  fuente={fuente}
                  error={error}
                  onChange={(val, f) => {
                    onRespuestaChange(preg.id, seccion.id, preg.pregunta, val, f);
                    const supportSuffix = preg.id.match(/__apoyo_\d+$/)?.[0] ?? '';
                    if (preg.id === `26${supportSuffix}`) {
                      for (const dependentId of ['27', '27.1', '28', '28.1']) {
                        const id = `${dependentId}${supportSuffix}`;
                        const oldAnswer = respuestas[id];
                        if (oldAnswer) onRespuestaChange(id, seccion.id, oldAnswer.pregunta, '', oldAnswer.fuente);
                      }
                    }
                  }}
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
                  disabled={Boolean(currentResp?.prellenada && !currentResp.prefillDisagreed)}
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
              const supportSuffix = preg.id.match(/__apoyo_\d+$/)?.[0] ?? '';
              const formaReporte = respuestas[`37${supportSuffix}`]?.valor || 'Agregada';
              const nivelGeografico = respuestas[`36${supportSuffix}`]?.valor || 'Estatal';
              return (
                <MatrixQuestion
                  pregunta={preg}
                  valor={valor}
                  formaReporte={formaReporte}
                  nivelGeografico={nivelGeografico}
                  error={error}
                  onChange={(val) => onRespuestaChange(preg.id, seccion.id, preg.pregunta, val)}
                />
              );
            case 'tabla_cuantificacion':
              return (
                <RepeatableQuantificationQuestion
                  pregunta={preg}
                  valor={valor}
                  error={error}
                  lockedPrefilledUnitRows={currentResp?.prellenada && !currentResp.prefillDisagreed
                    ? (valor as { rows?: unknown[] } | undefined)?.rows?.length ?? 0
                    : 0}
                  onChange={(value) => onRespuestaChange(preg.id, seccion.id, preg.pregunta, value)}
                />
              );
            default:
              return null;
          }
        })()}
        </fieldset>
      </div>
    );
  };
  // Agrupamiento visual por subsección
  let lastSubseccion = '';

  return (
    <div className="relative min-h-[calc(100vh-8rem)] py-6 sm:py-8 px-4 sm:px-6 max-w-4xl mx-auto flex flex-col justify-between z-10">
      <div className="space-y-6">
        <div className="glass-form-surface rounded-2xl border border-slate-900/15 p-4 shadow-xl sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-black">Selección del programa</p>
              <p className="mt-0.5 text-xs text-slate-600">
                Clave y ejercicio fiscal fijos durante toda la captura.
              </p>
            </div>
            {(clavePrograma || anioPrograma) && (
              <button
                type="button"
                onClick={onResetProgramSelection}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-900/20 px-2.5 py-1.5 text-xs font-medium text-black transition hover:bg-[#A57F2C]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A57F2C]"
                title="Reiniciar la clave y el año; se borrarán respuestas y archivos del programa"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Restablecer selección
              </button>
            )}
          </div>
          {seccion.numero === 1 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="clave-programa" className="mb-1.5 block text-xs font-medium text-black">
                  Clave del programa
                </label>
                <select
                  id="clave-programa"
                  value={clavePrograma}
                  disabled={Boolean(clavePrograma)}
                  onChange={(event) => onClaveProgramaChange(event.target.value)}
                  className="animated-select w-full rounded-lg border border-[#A57F2C]/50 bg-[#002F2A] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#A57F2C] focus:ring-2 focus:ring-[#A57F2C]/30 disabled:cursor-not-allowed disabled:opacity-80"
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
                  disabled={Boolean(anioPrograma)}
                  onChange={(event) => onAnioProgramaChange(event.target.value)}
                  className="animated-select w-full rounded-lg border border-[#A57F2C]/50 bg-[#002F2A] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#A57F2C] focus:ring-2 focus:ring-[#A57F2C]/30 disabled:cursor-not-allowed disabled:opacity-80"
                >
                  <option value="">Selecciona un año</option>
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                </select>
              </div>
            </div>
          ) : (
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-slate-900/10 bg-white/50 px-3 py-2">
                <dt className="text-[11px] font-medium text-slate-600">Clave del programa</dt>
                <dd className="mt-0.5 text-sm font-semibold text-slate-900">{clavePrograma || 'Sin seleccionar'}</dd>
              </div>
              <div className="rounded-md border border-slate-900/10 bg-white/50 px-3 py-2">
                <dt className="text-[11px] font-medium text-slate-600">Ejercicio fiscal</dt>
                <dd className="mt-0.5 text-sm font-semibold text-slate-900">{anioPrograma || 'Sin seleccionar'}</dd>
              </div>
            </dl>
          )}
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

          <h2 className="text-lg sm:text-xl md:text-2xl font-sans font-semibold tracking-tight text-stone-100">
            {seccion.titulo}
          </h2>

          {seccion.subtitulo && (
            <p className="text-xs sm:text-sm text-stone-200 font-semibold">
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

        {mostrarResumen ? (
          <section className="glass-form-surface space-y-4 rounded-xl border border-slate-900/15 p-4 shadow-lg sm:p-6">
            <h3 className="text-base font-semibold text-black">
              Resumen de la sección
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
            <div className="flex flex-col justify-between gap-2 border-t border-slate-900/10 pt-4 sm:flex-row">
              <button
                type="button"
                onClick={onPreviousSection}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-900/20 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-black/5"
              >
                <ArrowLeft className="h-4 w-4" />
                {seccion.numero === 1 ? 'Volver al inicio' : 'Anterior'}
              </button>
              <div className="flex flex-col justify-end gap-2 sm:flex-row">
                {seccion.id === 'apoyos_poblacion_atendida' && supportCount < 30 && (
                  <button
                    type="button"
                    onClick={() => {
                      onRespuestaChange('__apoyos_count', seccion.id, 'Número de tipos de apoyo', supportCount + 1);
                      setMostrarResumen(false);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#003d35] px-4 py-2.5 text-sm font-semibold text-[#003d35] transition hover:bg-[#003d35]/10"
                  >
                    <span aria-hidden="true">+</span>
                    Agregar otro tipo de apoyo
                  </button>
                )}
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
                  onClick={guardarYSiguiente}
                  disabled={guardandoSiguiente || !clavePrograma || !anioPrograma}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#003d35] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#002f2a] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {guardandoSiguiente ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  {guardandoSiguiente ? 'Guardando…' : 'Guardar y siguiente'}
                </button>
              </div>
            </div>
          </section>
        ) : (
          <div className="space-y-4">
            {seccion.id === 'apoyos_poblacion_atendida' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => onRespuestaChange('__apoyos_count', seccion.id, 'Número de tipos de apoyo', supportCount + 1)}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#003d35] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#002f2a]"
                >
                  <span aria-hidden="true">+</span>
                  Agregar otro tipo de apoyo
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
            <div className="flex flex-col justify-between gap-2 border-t border-white/15 pt-4 sm:flex-row">
              <button
                type="button"
                onClick={onPreviousSection}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4" />
                {seccion.numero === 1 ? 'Volver al inicio' : 'Anterior'}
              </button>
              <button
                type="button"
                onClick={guardarYSiguiente}
                disabled={guardandoSiguiente || !clavePrograma || !anioPrograma}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#A57F2C] px-5 py-2.5 text-sm font-bold text-[#10231f] transition hover:bg-[#c4993a] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {guardandoSiguiente ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {guardandoSiguiente ? 'Guardando…' : 'Guardar y siguiente'}
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
