import React from 'react';
import { SeccionConfig, DatosUsuario, RespuestaItem, ArchivoAdjunto } from '../types/form';
import {
  CheckCircle2,
  AlertCircle,
  Edit3,
  FileCheck,
  Send,
  User,
  ArrowLeft,
  Paperclip,
  Check,
} from 'lucide-react';

interface ReviewSectionProps {
  secciones: SeccionConfig[];
  usuario: DatosUsuario;
  respuestas: Record<string, RespuestaItem>;
  archivos: ArchivoAdjunto[];
  onEditSection: (index: number) => void;
  onEditUserData: () => void;
  onEditArchivos: () => void;
  onSubmitPrompt: () => void;
  onPrev: () => void;
}

export const ReviewSection: React.FC<ReviewSectionProps> = ({
  secciones,
  usuario,
  respuestas,
  archivos,
  onEditSection,
  onEditUserData,
  onEditArchivos,
  onSubmitPrompt,
  onPrev,
}) => {
  // Check completion for a given section
  const getSectionStatus = (seccion: SeccionConfig) => {
    let requiredCount = 0;
    let answeredCount = 0;

    for (const preg of seccion.preguntas) {
      if (preg.requerida) {
        requiredCount++;
        const resp = respuestas[preg.id]?.valor;
        if (resp !== undefined && resp !== null && resp !== '' && !(Array.isArray(resp) && resp.length === 0)) {
          answeredCount++;
        }
      }
    }

    const isComplete = requiredCount === 0 || answeredCount >= requiredCount;
    return { isComplete, requiredCount, answeredCount };
  };

  const isUserComplete = Boolean(
    usuario.nombre && usuario.correo && usuario.puesto && usuario.entidadDependencia
  );

  return (
    <div className="min-h-[calc(100vh-8rem)] py-6 sm:py-8 px-4 sm:px-6 max-w-4xl mx-auto flex flex-col justify-between">
      <div className="space-y-6">
        {/* Encabezado */}
        <div className="glass-institutional rounded-2xl p-5 sm:p-7 border border-[#A57F2C]/30 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 rounded-full bg-[#611232] text-[#A57F2C] text-xs font-bold uppercase tracking-wider border border-[#A57F2C]/40">
              VERIFICACIÓN PREVIA AL ENVÍO
            </span>
            <span className="text-xs text-stone-400 font-medium">Revisión de Integridad</span>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-stone-100">
            REVISIÓN DEL FORMULARIO
          </h2>
          <p className="text-xs sm:text-sm text-stone-300">
            Compruebe la información capturada en cada sección del instrumento antes de realizar el registro final. Puede pulsar "EDITAR" en cualquier sección para corregir o complementar datos.
          </p>
        </div>

        {/* Resumen de Datos del Usuario */}
        <div className="p-4 sm:p-5 rounded-xl glass-card border border-[#A57F2C]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-lg bg-[#002F2A] border border-[#A57F2C]/40 flex items-center justify-center text-[#A57F2C] shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-stone-100">
                  Datos de la persona que captura
                </h3>
                {isUserComplete ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                    <Check className="w-3.5 h-3.5 stroke-[3]" /> Completo
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400">
                    <AlertCircle className="w-3.5 h-3.5" /> Incompleto
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-300 mt-0.5">
                {usuario.nombre || 'Sin nombre'} • {usuario.puesto || 'Sin puesto'} • {usuario.entidadDependencia || 'Sin entidad'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onEditUserData}
            className="self-end sm:self-center px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[#A57F2C] hover:text-amber-200 bg-[#611232]/60 hover:bg-[#611232] border border-[#A57F2C]/30 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>← EDITAR</span>
          </button>
        </div>

        {/* Lista de Secciones del PDF */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#A57F2C]">
            Secciones del Cuestionario Oficial
          </h3>

          {secciones.map((seccion, idx) => {
            const status = getSectionStatus(seccion);

            return (
              <div
                key={seccion.id}
                className="p-3.5 sm:p-4 rounded-xl glass-card border border-[#A57F2C]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#A57F2C]/40 transition"
              >
                <div className="flex items-start space-x-3 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                      status.isComplete
                        ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                        : 'bg-amber-600/30 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs sm:text-sm font-semibold text-stone-100 truncate">
                        {seccion.titulo}
                      </p>
                      {status.isComplete ? (
                        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                          <Check className="w-3 h-3 stroke-[3]" /> Completa
                        </span>
                      ) : (
                        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-amber-300">
                          <AlertCircle className="w-3 h-3" /> Faltan {status.requiredCount - status.answeredCount} obligatorias
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-400 truncate">
                      {seccion.preguntas.length} preguntas en esta sección
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <div className="sm:hidden">
                    {status.isComplete ? (
                      <span className="text-[11px] font-medium text-emerald-400">✓ Completa</span>
                    ) : (
                      <span className="text-[11px] font-medium text-amber-300">⚠ Incompleta</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onEditSection(idx)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#A57F2C] hover:text-amber-200 bg-[#002F2A]/60 hover:bg-[#002F2A] border border-[#A57F2C]/30 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>← EDITAR</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Resumen de Archivos */}
        <div className="p-4 sm:p-5 rounded-xl glass-card border border-[#A57F2C]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-lg bg-[#611232] border border-[#A57F2C]/40 flex items-center justify-center text-[#A57F2C] shrink-0">
              <Paperclip className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-stone-100">
                  Documentación y Archivos Adjuntos
                </h3>
                <span className="text-[11px] font-semibold text-emerald-400">
                  ✓ {archivos.length} archivo{archivos.length === 1 ? '' : 's'} adjunto{archivos.length === 1 ? '' : 's'}
                </span>
              </div>
              <p className="text-xs text-stone-300 mt-0.5">
                {archivos.length > 0
                  ? archivos.map((a) => a.nombre).slice(0, 3).join(', ') + (archivos.length > 3 ? '...' : '')
                  : 'Sin archivos adjuntos'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onEditArchivos}
            className="self-end sm:self-center px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[#A57F2C] hover:text-amber-200 bg-[#002F2A]/60 hover:bg-[#002F2A] border border-[#A57F2C]/30 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>← EDITAR</span>
          </button>
        </div>
      </div>

      {/* Acciones de Navegación y Finalización */}
      <div className="mt-8 pt-6 border-t border-[#A57F2C]/20 flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
        <button
          type="button"
          onClick={onPrev}
          className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs sm:text-sm font-semibold text-stone-300 hover:text-white bg-[#002F2A]/60 hover:bg-[#002F2A] border border-[#A57F2C]/30 flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>← ANTERIOR (ARCHIVOS)</span>
        </button>

        <button
          type="button"
          onClick={onSubmitPrompt}
          className="w-full sm:w-auto px-10 py-4 rounded-xl text-sm font-bold text-[#002F2A] bg-[#A57F2C] hover:bg-[#c4993a] border border-[#A57F2C] shadow-lg flex items-center justify-center gap-2.5 transition hover:scale-[1.02] cursor-pointer"
        >
          <Send className="w-4 h-4" />
          <span>FINALIZAR REGISTRO INSTITUCIONAL</span>
        </button>
      </div>
    </div>
  );
};
