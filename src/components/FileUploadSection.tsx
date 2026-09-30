import React, { useState, useRef } from 'react';
import { ArchivoAdjunto } from '../types/form';
import {
  UploadCloud,
  FileText,
  FileSpreadsheet,
  Trash2,
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  File,
} from 'lucide-react';

interface FileUploadSectionProps {
  archivos: ArchivoAdjunto[];
  isOnline: boolean;
  onUpload: (archivo: ArchivoAdjunto) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onNext: () => void;
  onPrev: () => void;
}

const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
const ALLOWED_EXTENSIONS = ['.pdf', '.xls', '.xlsx'];

export const FileUploadSection: React.FC<FileUploadSectionProps> = ({
  archivos,
  isOnline,
  onUpload,
  onDelete,
  onNext,
  onPrev,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const processFile = async (file: File) => {
    setErrorMessage(null);

    // 1. Validar extensión
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setErrorMessage(
        'Este tipo de archivo no está permitido. Solo se aceptan documentos PDF (.pdf) y hojas de cálculo Excel (.xls, .xlsx).'
      );
      return;
    }

    // 2. Validar tamaño
    if (file.size > MAX_SIZE_BYTES) {
      setErrorMessage('El archivo supera el tamaño máximo permitido de 15 MB.');
      return;
    }

    setIsProcessing(true);

    try {
      // Read as base64 for IndexedDB persistence and offline resilience
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;
        const nuevoArchivo: ArchivoAdjunto = {
          id: `arch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          nombre: file.name,
          tipo: file.type || (ext === '.pdf' ? 'application/pdf' : 'application/vnd.ms-excel'),
          tamanio: file.size,
          tamanioLegible: formatFileSize(file.size),
          extension: ext,
          fechaCarga: new Date().toISOString(),
          estado: isOnline ? 'sincronizado' : 'pendiente_sync',
          dataBase64: base64Data,
        };

        await onUpload(nuevoArchivo);
        setIsProcessing(false);
      };

      reader.onerror = () => {
        setErrorMessage('No fue posible leer el archivo seleccionado.');
        setIsProcessing(false);
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      setErrorMessage('Error al procesar el archivo: ' + err.message);
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        await processFile(e.dataTransfer.files[i]);
      }
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      for (let i = 0; i < e.target.files.length; i++) {
        await processFile(e.target.files[i]);
      }
    }
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] py-6 sm:py-8 px-4 sm:px-6 max-w-4xl mx-auto flex flex-col justify-between">
      <div className="space-y-6">
        {/* Encabezado */}
        <div className="glass-institutional rounded-2xl p-5 sm:p-7 border border-[#A57F2C]/30 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 rounded-full bg-[#611232] text-[#A57F2C] text-xs font-bold uppercase tracking-wider border border-[#A57F2C]/40">
              DOCUMENTACIÓN / ARCHIVOS
            </span>
            <span className="text-xs text-stone-400 font-medium">Formatos .pdf, .xls, .xlsx</span>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-stone-100">
            Adjuntar Archivos y Evidencia Documental
          </h2>
          <p className="text-xs sm:text-sm text-stone-300">
            Adjunta los archivos necesarios para complementar tu registro del programa (reglas de operación, padrones anonimizados, informes MIR o anexos técnicos).
          </p>
        </div>

        {/* Mensaje de error */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 flex items-start gap-3 shadow-lg">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm font-medium">{errorMessage}</p>
          </div>
        )}

        {/* Zona Drag & Drop */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer rounded-2xl p-8 sm:p-12 text-center transition-all border-2 border-dashed flex flex-col items-center justify-center gap-3 ${
            isDragging
              ? 'border-[#A57F2C] bg-[#611232]/50 scale-[1.01]'
              : 'border-[#A57F2C]/40 bg-[#002F2A]/40 hover:bg-[#002F2A]/70 hover:border-[#A57F2C]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.xls,.xlsx,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handleFileInputChange}
            className="hidden"
          />

          <div className="w-14 h-14 rounded-full bg-[#611232] border border-[#A57F2C]/40 flex items-center justify-center text-[#A57F2C] shadow-lg">
            <UploadCloud className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <p className="text-sm sm:text-base font-semibold text-stone-100 uppercase tracking-wide">
              ARRASTRA TUS ARCHIVOS AQUÍ
            </p>
            <p className="text-xs text-stone-400">
              O haz clic para <span className="text-[#A57F2C] underline font-medium">SELECCIONAR ARCHIVOS</span> desde tu dispositivo
            </p>
          </div>

          <div className="inline-flex items-center gap-3 px-3 py-1.5 rounded-full bg-black/30 border border-[#A57F2C]/20 text-[11px] text-stone-300">
            <span>Formatos: <strong>PDF / XLS / XLSX</strong></span>
            <span>•</span>
            <span>Máximo <strong>15 MB</strong> por archivo</span>
          </div>

          {isProcessing && (
            <p className="text-xs text-[#A57F2C] animate-pulse">Procesando archivo...</p>
          )}
        </div>

        {/* Lista de archivos cargados */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#A57F2C] flex items-center justify-between">
            <span>Archivos Registrados ({archivos.length})</span>
            {!isOnline && (
              <span className="text-amber-300 font-normal normal-case">
                (Modo sin conexión: guardados en IndexedDB)
              </span>
            )}
          </h3>

          {archivos.length === 0 ? (
            <div className="p-6 rounded-xl glass-card text-center text-xs text-stone-400 italic">
              No se han adjuntado archivos todavía. Este paso es opcional pero recomendado.
            </div>
          ) : (
            <div className="space-y-2">
              {archivos.map((arch) => {
                const isExcel = arch.extension.includes('xls');
                const isPdf = arch.extension.includes('pdf');

                return (
                  <div
                    key={arch.id}
                    className="p-3.5 rounded-xl glass-card border border-[#A57F2C]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#A57F2C]/50 transition"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-[#611232]/80 border border-[#A57F2C]/30 flex items-center justify-center shrink-0">
                        {isExcel ? (
                          <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                        ) : isPdf ? (
                          <FileText className="w-5 h-5 text-rose-400" />
                        ) : (
                          <File className="w-5 h-5 text-[#A57F2C]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-semibold text-stone-100 truncate" title={arch.nombre}>
                          {arch.nombre}
                        </p>
                        <div className="flex items-center space-x-2 text-[11px] text-stone-400">
                          <span className="uppercase font-mono text-[#A57F2C]">{arch.extension.replace('.', '')}</span>
                          <span>•</span>
                          <span>{arch.tamanioLegible}</span>
                          <span>•</span>
                          {arch.estado === 'sincronizado' ? (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Sincronizado
                            </span>
                          ) : (
                            <span className="text-amber-300 flex items-center gap-1" title="Se sincronizará al detectar conexión con el servidor">
                              <Clock className="w-3 h-3" /> Archivo pendiente de sincronización
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDelete(arch.id)}
                      className="self-end sm:self-center px-3 py-1.5 rounded-lg text-xs font-medium text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900 border border-rose-500/30 flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ELIMINAR</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Navegación inferior */}
      <div className="mt-8 pt-6 border-t border-[#A57F2C]/20 flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
        <button
          type="button"
          onClick={onPrev}
          className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs sm:text-sm font-semibold text-stone-300 hover:text-white bg-[#002F2A]/60 hover:bg-[#002F2A] border border-[#A57F2C]/30 flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>← ANTERIOR</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-xs sm:text-sm font-bold text-[#002F2A] bg-[#A57F2C] hover:bg-[#c4993a] border border-[#A57F2C] shadow-lg flex items-center justify-center gap-2 transition hover:scale-[1.02] cursor-pointer"
        >
          <span>CONTINUAR A REVISIÓN →</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
