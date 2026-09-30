import React from 'react';
import { DatosUsuario, RespuestaItem, ArchivoAdjunto } from '../types/form';
import {
  CheckCircle2,
  FileCheck2,
  Printer,
  Download,
  RotateCcw,
  ShieldCheck,
  Building,
  Calendar,
  User,
  Hash,
} from 'lucide-react';
import { CUESTIONARIO_TITULO, CUESTIONARIO_SUBTITULO } from '../data/cuestionarioInegi';

interface SuccessViewProps {
  folio: string;
  fechaEnvio: string;
  usuario: DatosUsuario;
  respuestas: Record<string, RespuestaItem>;
  archivos: ArchivoAdjunto[];
  onRestart: () => void;
}

export const SuccessView: React.FC<SuccessViewProps> = ({
  folio,
  fechaEnvio,
  usuario,
  respuestas,
  archivos,
  onRestart,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJSON = () => {
    const data = {
      institucion: 'IMSS-BIENESTAR',
      instrumento: CUESTIONARIO_TITULO,
      folio,
      fechaEnvio,
      usuario,
      totalRespuestas: Object.keys(respuestas).length,
      archivos: archivos.map((a) => ({
        nombre: a.nombre,
        tipo: a.tipo,
        tamanio: a.tamanioLegible,
      })),
      respuestas,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `comprobante_${folio}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formattedDate = new Date(fechaEnvio).toLocaleString('es-MX', {
    dateStyle: 'long',
    timeStyle: 'medium',
  });

  return (
    <div className="min-h-[calc(100vh-6rem)] py-8 px-4 sm:px-6 max-w-3xl mx-auto flex items-center justify-center">
      <div className="w-full glass-institutional rounded-3xl p-6 sm:p-10 border-2 border-[#A57F2C]/40 shadow-2xl space-y-8 print:bg-white print:text-black print:border-black">
        {/* Banner de Éxito */}
        <div className="text-center space-y-3">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <span className="inline-block px-3 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-xs font-bold tracking-wider uppercase">
            REGISTRO INSTITUCIONAL CONFIRMADO
          </span>

          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-100 print:text-black">
            Formulario enviado correctamente
          </h2>

          <p className="text-xs sm:text-sm text-stone-300 max-w-lg mx-auto print:text-gray-700">
            La información ha sido registrada y respaldada conforme a los lineamientos del Inventario Federal de Programas y Acciones de Desarrollo Social 2024 - 2025.
          </p>
        </div>

        {/* Tarjeta de Folio Oficial */}
        <div className="p-6 rounded-2xl bg-[#002F2A]/90 border border-[#A57F2C] text-center space-y-2 shadow-inner print:border-gray-800">
          <span className="text-xs uppercase font-bold text-[#A57F2C] tracking-widest flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4" /> NÚMERO DE FOLIO OFICIAL
          </span>
          <div className="font-mono text-2xl sm:text-3xl font-black text-amber-200 tracking-wider">
            {folio}
          </div>
          <p className="text-xs text-stone-300 flex items-center justify-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-[#A57F2C]" />
            <span>Fecha y hora de certificación: {formattedDate}</span>
          </p>
        </div>

        {/* Desglose de Información */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
          <div className="p-4 rounded-xl glass-card border border-[#A57F2C]/20 space-y-2">
            <h4 className="font-bold text-[#A57F2C] flex items-center gap-1.5 uppercase text-xs">
              <User className="w-4 h-4" /> Datos de Captura
            </h4>
            <div className="space-y-1 text-stone-200">
              <p><strong className="text-stone-400">Nombre:</strong> {usuario.nombre}</p>
              <p><strong className="text-stone-400">Puesto:</strong> {usuario.puesto}</p>
              <p><strong className="text-stone-400">Entidad:</strong> {usuario.entidadDependencia}</p>
              <p><strong className="text-stone-400">Correo:</strong> {usuario.correo}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl glass-card border border-[#A57F2C]/20 space-y-2">
            <h4 className="font-bold text-[#A57F2C] flex items-center gap-1.5 uppercase text-xs">
              <FileCheck2 className="w-4 h-4" /> Resumen del Instrumento
            </h4>
            <div className="space-y-1 text-stone-200">
              <p><strong className="text-stone-400">Preguntas respondidas:</strong> {Object.keys(respuestas).length} de 32</p>
              <p><strong className="text-stone-400">Archivos adjuntos:</strong> {archivos.length}</p>
              <p><strong className="text-stone-400">Estado de sincronización:</strong> Certificado</p>
              <p><strong className="text-stone-400">Ciclo operativo:</strong> 2024 y 2025</p>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-[#A57F2C]/20 print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="w-full sm:w-auto px-5 py-3 rounded-xl text-xs sm:text-sm font-semibold text-stone-200 hover:text-white bg-[#002F2A] hover:bg-[#003d36] border border-[#A57F2C]/40 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[#A57F2C]" />
            <span>Imprimir comprobante</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadJSON}
            className="w-full sm:w-auto px-5 py-3 rounded-xl text-xs sm:text-sm font-semibold text-stone-200 hover:text-white bg-[#611232] hover:bg-[#7a1840] border border-[#A57F2C]/40 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#A57F2C]" />
            <span>Descargar comprobante (JSON)</span>
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="w-full sm:w-auto px-5 py-3 rounded-xl text-xs sm:text-sm font-semibold text-[#A57F2C] hover:text-amber-200 bg-black/40 hover:bg-black/60 border border-[#A57F2C]/30 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Nueva captura</span>
          </button>
        </div>
      </div>
    </div>
  );
};
