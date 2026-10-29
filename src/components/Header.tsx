import React from 'react';
import { EstadoConexion } from '../types/form';
import { Wifi, WifiOff, RefreshCw, CheckCircle, ShieldCheck, Database, X, ChevronDown, Lock, LogOut } from 'lucide-react';
import logoNacional from '../assets/logonacional.svg';
import eggsGif from '../assets/eggs.gif';

interface HeaderProps {
  estadoConexion: EstadoConexion;
  estadoGuardado: 'guardando' | 'guardado' | 'pendiente' | 'error';
  seccionActualTitulo?: string;
  onManualSync?: () => void;
  onAdminAccess?: () => void;
  onFormSignOut?: () => void;
  isLanding?: boolean;
  usesSupabase?: boolean;
  showInstructions: boolean;
}

interface InstructionPreviewField {
  label: string;
  type: 'input' | 'textarea' | 'choices' | 'table';
  placeholder?: string;
  options?: readonly string[];
  columns?: readonly string[];
  required?: boolean;
}

interface InstructionSection {
  title: string;
  previewLabel: string;
  fields: readonly InstructionPreviewField[];
  showPrefillExample?: boolean;
  instructions: readonly string[];
}

const INSTRUCTION_SECTIONS: readonly InstructionSection[] = [
  {
    title: 'Datos generales',
    previewLabel: 'Datos del capturista',
    fields: [
      { label: '1. Nombre de la persona que captura la información', type: 'input', placeholder: 'Nombre y apellidos completos', required: true },
      { label: '2. Puesto', type: 'input', placeholder: 'Cargo o puesto institucional', required: true },
      { label: '10. ¿Participaron otras dependencias?', type: 'choices', options: ['Sí', 'No'], required: true },
    ],
    showPrefillExample: true,
    instructions: [
      'Selecciona la clave del programa y el ejercicio fiscal (2024 o 2025) antes de capturar. Ambos quedan bloqueados durante la captura. Si te equivocaste, pulsa «Restablecer selección»; se borrarán las respuestas y archivos del programa, pero se conservarán los datos del capturista.',
      'Completa los datos del capturista, la persona responsable del programa y las dependencias participantes. Los campos marcados con * son obligatorios.',
      'Algunas respuestas pueden aparecer prellenadas según la clave y el año. Lee la nota de origen; elige «De acuerdo» para conservarlas o «No, corregir» para habilitar su edición.',
      'Pulsa «Guardar y siguiente» para guardar el avance. Puedes volver a esta sección desde la navegación y seguir editándola.',
    ],
  },
  {
    title: 'Normatividad y objetivo del programa',
    previewLabel: 'Normatividad que regula al programa',
    fields: [
      { label: '12. Nombre completo del instrumento normativo', type: 'input', placeholder: 'Nombre del documento oficial', required: true },
      { label: '13. Enlace oficial del documento', type: 'input', placeholder: 'https://sitio-oficial.gob.mx', required: true },
      { label: '14. Objetivo general del programa', type: 'textarea', placeholder: 'Describe el objetivo con base en la norma', required: true },
    ],
    instructions: [
      'Escribe el nombre completo del instrumento normativo que reguló el programa durante el año seleccionado.',
      'Agrega la dirección completa de la página oficial donde se consulta o descarga el documento; evita enlaces abreviados.',
      'Describe el objetivo general con base en la norma. Distingue «No aplica» de «No disponible» siguiendo los criterios generales.',
    ],
  },
  {
    title: 'Población potencial y objetivo',
    previewLabel: 'Identificación de las poblaciones',
    fields: [
      { label: '15. Población potencial', type: 'textarea', placeholder: 'Personas que presentan la necesidad que atiende el programa', required: true },
      { label: '16. Unidad de medida', type: 'input', placeholder: 'Personas, hogares, unidades de salud…', required: true },
      { label: '17. Población objetivo', type: 'textarea', placeholder: 'Población que el programa planea atender', required: true },
    ],
    instructions: [
      'Describe por separado la población potencial, que presenta la necesidad que busca atender el programa, y la población objetivo, a la que planea atender.',
      'Indica criterios de identificación, cobertura, unidad de medida y cifras correspondientes al año seleccionado.',
      'Usa información de diagnósticos, padrones o registros administrativos y cita la fuente cuando se solicite.',
    ],
  },
  {
    title: 'Criterios de priorización y ámbito de atención',
    previewLabel: 'Priorización y cobertura territorial',
    fields: [
      { label: '20. ¿El programa aplica criterios de priorización?', type: 'choices', options: ['Sí', 'No'], required: true },
      { label: '20.1. Describa los criterios aplicados', type: 'textarea', placeholder: 'Criterios utilizados para priorizar personas o territorios' },
      { label: '21. Ámbito de atención', type: 'choices', options: ['Urbano', 'Rural', 'Ambos'], required: true },
    ],
    instructions: [
      'Indica si el programa aplica criterios para priorizar personas, localidades o territorios y describe cómo se utilizan.',
      'Señala si la atención es urbana, rural o ambas, de acuerdo con la operación del programa durante el ejercicio reportado.',
      'Responde las preguntas condicionales que aparezcan; algunas dependen de la opción seleccionada previamente.',
    ],
  },
  {
    title: 'Padrón de beneficiarios y contraloría social',
    previewLabel: 'Registro de beneficiarios y participación social',
    fields: [
      { label: '¿El programa cuenta con padrón de beneficiarios?', type: 'choices', options: ['Sí', 'No'], required: true },
      { label: 'Sistema o registro utilizado', type: 'input', placeholder: 'Nombre del padrón o sistema' },
      { label: 'Mecanismos de contraloría social', type: 'textarea', placeholder: 'Comités, seguimiento o participación ciudadana' },
    ],
    instructions: [
      'Describe el padrón o registro utilizado para identificar a las personas beneficiarias y la información que contiene.',
      'Explica los mecanismos de contraloría social o participación ciudadana implementados por el programa.',
      'Apóyate en padrones, reglas de operación e informes del ejercicio. Completa las preguntas adicionales que se habiliten.',
    ],
  },
  {
    title: 'Apoyos otorgados y población atendida',
    previewLabel: 'Tipo de apoyo, monto, modalidad y frecuencia',
    fields: [
      { label: 'Tipo de apoyo', type: 'input', placeholder: 'Bien, servicio, transferencia…', required: true },
      { label: 'Detalle del apoyo', type: 'table', columns: ['Unidad de medida', 'Cantidad', 'Monto'] },
      { label: 'Población atendida', type: 'input', placeholder: 'Personas atendidas en el ejercicio fiscal', required: true },
    ],
    instructions: [
      'Registra los apoyos efectivamente otorgados durante el año seleccionado, junto con modalidad, periodicidad y montos solicitados.',
      'Captura la población atendida con su unidad de medida y desgloses disponibles. Verifica que los totales correspondan al mismo periodo.',
      'Si el programa entrega varios tipos de apoyo, usa «Agregar otro tipo de apoyo» para registrar cada uno por separado.',
    ],
  },
] as const;

const FILLING_GUIDELINES = [
  'Lea cuidadosamente cada pregunta antes de responder.',
  'Responda con base en la información documental con la que cuenta el programa (normatividad, registros administrativos, padrones, etc.).',
  'Registre las fuentes de información cuando la pregunta lo requiera.',
  'Verifique que la información registrada corresponda al ejercicio fiscal solicitado.',
  'Responda «No aplica» cuando, por las características del programa, la información solicitada no deba existir o no resulte aplicable. Responda «No disponible» cuando el programa deba contar con dicha información, pero esta no se encuentre disponible al momento de la captura.',
  'Registre nombres completos y evite el uso de acrónimos o siglas.',
];

export const Header: React.FC<HeaderProps> = ({
  estadoConexion,
  estadoGuardado,
  seccionActualTitulo,
  onManualSync,
  onAdminAccess,
  onFormSignOut,
  isLanding = false,
  usesSupabase = false,
  showInstructions,
}) => {
  const [logoNoDisponible, setLogoNoDisponible] = React.useState(false);
  const [instruccionesAbiertas, setInstruccionesAbiertas] = React.useState(false);
  const [seccionInstrucciones, setSeccionInstrucciones] = React.useState(0);
  const gabineteButtonRef = React.useRef<HTMLButtonElement>(null);
  const cerrarInstruccionesRef = React.useRef<HTMLButtonElement>(null);
  const logoTapCountRef = React.useRef(0);
  const logoTapTimeoutRef = React.useRef<number | null>(null);
  const nationalLogoTapCountRef = React.useRef(0);
  const nationalLogoTapTimeoutRef = React.useRef<number | null>(null);
  const eggsTimeoutRef = React.useRef<number | null>(null);
  const [showEggs, setShowEggs] = React.useState(false);

  const handleLogoTap = () => {
    if (logoTapTimeoutRef.current !== null) {
      window.clearTimeout(logoTapTimeoutRef.current);
    }
    logoTapCountRef.current += 1;

    if (logoTapCountRef.current >= 5) {
      logoTapCountRef.current = 0;
      onAdminAccess?.();
      return;
    }

    logoTapTimeoutRef.current = window.setTimeout(() => {
      logoTapCountRef.current = 0;
      logoTapTimeoutRef.current = null;
    }, 2200);
  };

  const handleNationalLogoTap = () => {
    if (nationalLogoTapTimeoutRef.current !== null) {
      window.clearTimeout(nationalLogoTapTimeoutRef.current);
    }
    nationalLogoTapCountRef.current += 1;

    if (nationalLogoTapCountRef.current >= 10) {
      nationalLogoTapCountRef.current = 0;
      nationalLogoTapTimeoutRef.current = null;
      setShowEggs(true);
      if (eggsTimeoutRef.current !== null) window.clearTimeout(eggsTimeoutRef.current);
      eggsTimeoutRef.current = window.setTimeout(() => {
        setShowEggs(false);
        eggsTimeoutRef.current = null;
      }, 5000);
      return;
    }

    nationalLogoTapTimeoutRef.current = window.setTimeout(() => {
      nationalLogoTapCountRef.current = 0;
      nationalLogoTapTimeoutRef.current = null;
    }, 3500);
  };

  React.useEffect(() => () => {
    if (logoTapTimeoutRef.current !== null) window.clearTimeout(logoTapTimeoutRef.current);
    if (nationalLogoTapTimeoutRef.current !== null) window.clearTimeout(nationalLogoTapTimeoutRef.current);
    if (eggsTimeoutRef.current !== null) window.clearTimeout(eggsTimeoutRef.current);
  }, []);

  React.useEffect(() => {
    if (!instruccionesAbiertas || !showInstructions) return;

    cerrarInstruccionesRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setInstruccionesAbiertas(false);
        gabineteButtonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [instruccionesAbiertas, showInstructions]);

  React.useEffect(() => {
    if (!showInstructions) setInstruccionesAbiertas(false);
  }, [showInstructions]);

  const cerrarInstrucciones = () => {
    setInstruccionesAbiertas(false);
    gabineteButtonRef.current?.focus();
  };

  return (
    <>
    <header
      className="sticky top-0 z-40 w-full bg-transparent text-slate-900"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-[68px] items-center justify-between gap-3">
          {/* Logo & Identidad Institucional */}
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={handleLogoTap}
              aria-label="Logo de IMSS Bienestar"
              className="grid shrink-0 place-items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A57F2C]"
            >
              {!logoNoDisponible ? (
                <img
                  src="https://imssbienestar.gob.mx/assets/img/imb_b.svg"
                  alt="IMSS Bienestar"
                  className="h-[42px] w-auto shrink-0 object-contain drop-shadow-[0_1px_5px_rgba(0,0,0,0.9)]"
                  onError={() => setLogoNoDisponible(true)}
                />
              ) : (
                <span className="text-[10px] font-bold leading-tight text-white">
                  IMSS<br />BIENESTAR
                </span>
              )}
            </button>
            <div className="min-w-0 leading-tight">
              <h1 className="truncate text-xs font-semibold text-white sm:text-sm">
                Cuestionario Inventario Federal
              </h1>
            </div>
            {showInstructions && (
              <button
                ref={gabineteButtonRef}
                type="button"
                className={`cabinet-trigger ${instruccionesAbiertas ? 'is-open' : ''}`}
                onClick={() => {
                  setSeccionInstrucciones(0);
                  setInstruccionesAbiertas(true);
                }}
                aria-label="Abrir instrucciones de llenado"
                aria-expanded={instruccionesAbiertas}
                aria-controls="instrucciones-llenado"
                title="Instrucciones de llenado"
              >
                <span className="cabinet-icon" aria-hidden="true">
                  <span className="cabinet-back">
                    <span className="cabinet-shelf cabinet-shelf-upper" />
                    <span className="cabinet-shelf cabinet-shelf-mid" />
                    <span className="cabinet-shelf cabinet-shelf-lower" />
                  </span>
                  <span className="cabinet-front">
                    <span className="cabinet-cross" />
                    <span className="cabinet-knob" />
                  </span>
                </span>
                <span className="cabinet-instruction-cue">
                  <span className="cabinet-point-finger" aria-hidden="true">👈</span>
                  <span>Instrucciones</span>
                </span>
              </button>
            )}
          </div>

          {/* Estado de Conexión, Guardado y Sincronización */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {onFormSignOut && (
              <button
                type="button"
                onClick={onFormSignOut}
                aria-label="Cerrar sesión del formulario"
                title="Cerrar sesión"
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/20 px-2 text-xs font-medium text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A57F2C] sm:px-2.5"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Cerrar sesión</span>
              </button>
            )}
            {/* Indicador de Guardado */}
            <div className={`${isLanding ? 'hidden' : 'hidden sm:flex'} items-center px-2.5 py-1 rounded-full text-xs font-medium border border-white/20 bg-white/5`}>
              {estadoGuardado === 'guardando' && (
                <span className="flex items-center text-[#A57F2C] animate-pulse gap-1.5">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Guardando...
                </span>
              )}
              {estadoGuardado === 'guardado' && (
                <span className="flex items-center text-emerald-400 gap-1.5">
                  <CheckCircle className="w-3 h-3" />
                  Guardado
                </span>
              )}
              {estadoGuardado === 'pendiente' && (
                <span className="flex items-center text-amber-300 gap-1.5" title="Guardado localmente en IndexedDB">
                  <Database className="w-3 h-3" />
                  Pendiente de sincronización
                </span>
              )}
              {estadoGuardado === 'error' && (
                <span className="flex items-center text-rose-300 gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  Error al guardar
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleNationalLogoTap}
              aria-label="Logo nacional, diez toques para activar la animación"
              title="Logo nacional"
              className="grid h-11 w-11 shrink-0 place-items-center p-1 opacity-90 transition hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A57F2C]"
            >
              <img src={logoNacional} alt="" className="h-full w-full object-contain brightness-0 invert" />
            </button>

            {/* Píldora de Conexión / Offline */}
            <div
              className={`flex items-center space-x-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold tracking-wide transition-colors sm:px-3 sm:text-xs ${
                estadoConexion.sincronizando
                  ? 'bg-[#A57F2C]/20 border-[#A57F2C] text-[#A57F2C]'
                  : estadoConexion.online && estadoConexion.apiDisponible
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/70 border-rose-500/40 text-rose-300'
              }`}
            >
              {estadoConexion.online && estadoConexion.apiDisponible ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="hidden sm:inline">CONECTADO</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                  <span className="hidden sm:inline">SIN CONEXIÓN</span>
                </>
              )}
            </div>

            {/* Botón de Sincronización Manual si hay pendientes */}
            {estadoConexion.elementosPendientes > 0 && (
              <button
                type="button"
                onClick={onManualSync}
                disabled={!onManualSync || estadoConexion.sincronizando}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-200 bg-amber-950/80 hover:bg-amber-900/90 border border-amber-500/40 rounded-full transition-all"
                title="Reintentar sincronización de los cambios locales pendientes"
              >
                <RefreshCw className={`w-3 h-3 ${estadoConexion.sincronizando ? 'animate-spin' : ''}`} />
                <span>{estadoConexion.sincronizando ? 'Enviando' : 'Sync'} ({estadoConexion.elementosPendientes})</span>
              </button>
            )}

          </div>
        </div>
        {showInstructions && instruccionesAbiertas && (
          <div
            className="cabinet-guide-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) cerrarInstrucciones();
            }}
          >
            <section
              id="instrucciones-llenado"
              className="cabinet-guide-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="instrucciones-llenado-titulo"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#d5b66a]">Cuestionario de equipamiento</p>
                  <h2 id="instrucciones-llenado-titulo" className="mt-1 text-lg font-semibold text-white">
                    Instrucciones por sección
                  </h2>
                  <p className="mt-1 text-xs text-stone-400">Selecciona una sección para ver su pantalla y cómo llenarla.</p>
                </div>
                <button
                  ref={cerrarInstruccionesRef}
                  type="button"
                  onClick={cerrarInstrucciones}
                  aria-label="Cerrar instrucciones"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-white/15 text-stone-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d5b66a]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div role="group" aria-label="Secciones del cuestionario" className="mt-4 grid grid-cols-6 gap-1.5">
                {INSTRUCTION_SECTIONS.map((section, index) => (
                  <button
                    key={section.title}
                    type="button"
                    aria-label={`Ver sección ${index + 1}: ${section.title}`}
                    aria-pressed={seccionInstrucciones === index}
                    title={section.title}
                    onClick={() => setSeccionInstrucciones(index)}
                    className={`min-h-9 rounded-md border text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d5b66a] ${
                      seccionInstrucciones === index
                        ? 'border-[#d5b66a] bg-[#d5b66a] text-[#10231f]'
                        : 'border-white/15 bg-white/5 text-stone-300 hover:bg-white/10'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
              <div className="cabinet-guide-workspace mt-5">
                <section className="cabinet-guide-preview" aria-live="polite">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#d5b66a]">
                      Sección {seccionInstrucciones + 1} de 6
                    </p>
                    <h3 className="mt-1 text-base font-semibold leading-snug text-white sm:text-lg">
                      {INSTRUCTION_SECTIONS[seccionInstrucciones].title}
                    </h3>
                  </div>
                  <div
                    className="cabinet-form-replica"
                    role="img"
                    aria-label={`Réplica visual de la selección del programa y las preguntas de la sección ${seccionInstrucciones + 1}: ${INSTRUCTION_SECTIONS[seccionInstrucciones].title}`}
                  >
                    <div className="guide-selection-replica">
                      <div className="guide-selection-heading">
                        <span>Selección del programa</span>
                        <span className="guide-selection-lock">
                          {seccionInstrucciones === 0 ? 'Se bloquea al elegir' : 'Selección fija'}
                        </span>
                      </div>
                      <div className="guide-selection-fields">
                        {[
                          { label: 'Clave del programa', placeholder: seccionInstrucciones === 0 ? 'Selecciona una clave' : 'Clave seleccionada' },
                          { label: 'Año del programa', placeholder: seccionInstrucciones === 0 ? 'Selecciona un año' : 'Ejercicio seleccionado' },
                        ].map(({ label, placeholder }) => (
                          <div key={label}>
                            <span className="guide-replica-label">{label}</span>
                            <span className="guide-replica-control">
                              {placeholder}
                              {seccionInstrucciones === 0 ? <ChevronDown aria-hidden="true" /> : <Lock aria-hidden="true" />}
                            </span>
                          </div>
                        ))}
                      </div>
                      <p className="guide-selection-note">
                        Al elegir ambos datos quedan fijos; para cambiarlos se restablece la selección.
                      </p>
                    </div>
                    <div className="guide-replica-section-heading">
                      <span>SECCIÓN {seccionInstrucciones + 1} DE 6</span>
                      <strong>{INSTRUCTION_SECTIONS[seccionInstrucciones].previewLabel}</strong>
                    </div>
                    <div className="guide-replica-questions">
                      {INSTRUCTION_SECTIONS[seccionInstrucciones].fields.map((field) => (
                        <div className="guide-replica-question" key={field.label}>
                          <span className="guide-replica-question-label">
                            {field.label}{field.required && <span className="guide-replica-required">*</span>}
                          </span>
                          {field.type === 'choices' ? (
                            <div className="guide-replica-choices">
                              {field.options?.map((option) => <span key={option}>{option}</span>)}
                            </div>
                          ) : field.type === 'table' ? (
                            <div className="guide-replica-table">
                              {field.columns?.map((column) => <span key={column}>{column}</span>)}
                            </div>
                          ) : (
                            <div className={`guide-replica-control ${field.type === 'textarea' ? 'is-multiline' : ''}`}>
                              {field.placeholder}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {INSTRUCTION_SECTIONS[seccionInstrucciones].showPrefillExample && (
                      <div className="guide-prefill-replica">
                        <span className="guide-prefill-caption">Ejemplo de respuesta prellenada</span>
                        <span className="guide-prefill-value">Información sugerida con base en la clave y el año</span>
                        <span className="guide-prefill-caption">¿Está de acuerdo con esta respuesta?</span>
                        <div className="guide-replica-choices">
                          <span>De acuerdo</span>
                          <span>No, corregir</span>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
                <section className="cabinet-guide-steps">
                  <h4 className="text-xs font-bold uppercase text-[#f0d58e]">Cómo llenar esta sección</h4>
                  <ol className="mt-3 space-y-3 text-sm leading-relaxed text-stone-200">
                    {INSTRUCTION_SECTIONS[seccionInstrucciones].instructions.map((instruction, index) => (
                      <li key={instruction}>
                        <span className="guide-step-number">{index + 1}</span>
                        <span>{instruction}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              </div>
              <section className="cabinet-general-guidelines mt-6" aria-labelledby="criterios-generales-titulo">
                <h3 id="criterios-generales-titulo" className="text-sm font-bold text-white">
                  Instrucciones generales de llenado
                </h3>
                <ol className="mt-3 grid grid-cols-1 gap-x-8 gap-y-2.5 text-xs leading-relaxed text-stone-300 sm:grid-cols-2">
                  {FILLING_GUIDELINES.map((guideline, index) => (
                    <li key={guideline}>
                      <span className="guide-step-number">{index + 1}</span>
                      <span>{guideline}</span>
                    </li>
                  ))}
                </ol>
              </section>
            </section>
          </div>
        )}
      </div>
    </header>
    {showEggs && (
      <div className="fixed inset-0 z-[200] flex h-dvh w-full items-center justify-center overflow-hidden bg-black" aria-hidden="true">
        <img src={eggsGif} alt="" className="h-full w-full object-contain" />
      </div>
    )}
    </>
  );
};
