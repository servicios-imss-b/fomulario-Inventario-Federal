import React from 'react';
import { EstadoConexion } from '../types/form';
import { Wifi, WifiOff, RefreshCw, CheckCircle, ShieldCheck, Database } from 'lucide-react';

interface HeaderProps {
  estadoConexion: EstadoConexion;
  estadoGuardado: 'guardando' | 'guardado' | 'pendiente' | 'error';
  seccionActualTitulo?: string;
  onManualSync?: () => void;
  onOpenInfo?: () => void;
  isLanding?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  estadoConexion,
  estadoGuardado,
  seccionActualTitulo,
  onManualSync,
  onOpenInfo,
  isLanding = false,
}) => {
  const [logoNoDisponible, setLogoNoDisponible] = React.useState(false);

  return (
    <header
      className={`sticky top-0 z-40 w-full text-white ${
        isLanding
          ? 'border-b border-white/10 bg-black/20 shadow-none backdrop-blur-sm'
          : 'border-b-2 border-[#a57f2c] bg-[#002f2a] shadow-md'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-[68px] items-center justify-between gap-3">
          {/* Logo & Identidad Institucional */}
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            {!logoNoDisponible ? (
              <img
                src="https://imssbienestar.gob.mx/assets/img/imb_b.svg"
                alt="IMSS Bienestar"
                className="h-[42px] w-auto shrink-0 object-contain"
                onError={() => setLogoNoDisponible(true)}
              />
            ) : (
              <span className="text-[10px] font-bold leading-tight text-white">
                IMSS<br />BIENESTAR
              </span>
            )}
            <div className="min-w-0 leading-tight">
              <h1 className="truncate text-xs font-semibold text-white sm:text-sm">
                Cuestionario de equipamiento
              </h1>
            </div>
          </div>

          {/* Estado de Conexión, Guardado y Sincronización */}
          <div className="flex items-center space-x-2 sm:space-x-3">
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
              {estadoConexion.sincronizando ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#A57F2C]" />
                  <span className="hidden sm:inline">↻ SINCRONIZANDO</span>
                </>
              ) : estadoConexion.online && estadoConexion.apiDisponible ? (
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
                onClick={onManualSync}
                className="hidden md:flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-200 bg-amber-950/80 hover:bg-amber-900/90 border border-amber-500/40 rounded-full transition-all"
                title="Presione para sincronizar datos locales pendientes con el servidor"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Sync ({estadoConexion.elementosPendientes})</span>
              </button>
            )}

            {/* Botón Información / Arquitectura */}
            {onOpenInfo && !isLanding && (
              <button
                onClick={onOpenInfo}
                className="rounded-md border border-[#a57f2c]/70 p-1.5 text-xs font-medium text-[#f4ead0] transition hover:bg-white/10 sm:px-2.5 sm:py-1"
                title="Detalles del instrumento y arquitectura"
              >
                <span className="hidden sm:inline">Arquitectura & PDF</span>
                <span className="sm:hidden">ℹ</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
