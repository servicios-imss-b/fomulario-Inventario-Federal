import React, { useState, useEffect } from 'react';
import { ImageOff, Loader2 } from 'lucide-react';
import { SVG_FALLBACK_EQUIPO } from '../assets/images';

interface SectionBackgroundProps {
  imageUrl: string;
  alt: string;
  mode?: 'form' | 'instructions';
  overlayOpacity?: number;
}

export const SectionBackground: React.FC<SectionBackgroundProps> = ({
  imageUrl,
  alt,
  mode = 'form',
  overlayOpacity = 0.08,
}) => {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  useEffect(() => {
    setStatus('loading');
    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      setStatus('loaded');
    };
    img.onerror = () => {
      setStatus('error');
    };

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [imageUrl]);

  return (
    <div
      className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none"
      aria-hidden="true"
    >
      {/* 1. Capa de Fondo: Imagen Real con Manejo de Carga y Error */}
      {status === 'loaded' && (
        <img
          src={imageUrl}
          alt={alt}
          className={`w-full h-full object-cover filter contrast-[1.08] animate-image-fade ${
            mode === 'instructions' ? 'brightness-[0.98]' : 'brightness-[0.88]'
          }`}
          style={{
            minHeight: '100vh',
            minWidth: '100vw',
            objectPosition: 'center center',
          }}
        />
      )}

      {status === 'loading' && (
        <div className="w-full h-full bg-[#020e0c] flex items-center justify-center">
          {/* Shimmer / Indicador visual de carga sutil */}
          <div className="absolute top-24 right-4 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 border border-[#A57F2C]/30 text-[10px] text-[#A57F2C]">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Cargando fondo temático...</span>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div
          className="w-full h-full bg-[#020e0c]"
          style={{
            backgroundImage: `url("${SVG_FALLBACK_EQUIPO}")`,
            backgroundRepeat: 'repeat',
          }}
        >
          {/* Indicador visual discreto de fallback */}
          <div className="absolute top-24 right-4 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 border border-stone-700 text-[10px] text-stone-400">
            <ImageOff className="w-3 h-3" />
            <span>Fondo institucional estándar</span>
          </div>
        </div>
      )}

      {/* 2. Capa institucional semitransparente para garantizar 100% de legibilidad */}
      <div
        className="absolute inset-0 transition-all duration-500"
        style={{
          background:
            mode === 'instructions'
              ? `linear-gradient(rgba(20, 23, 23, ${overlayOpacity}), rgba(20, 23, 23, ${Math.min(0.18, overlayOpacity + 0.04)}))`
              : `rgba(14, 25, 23, ${overlayOpacity})`,
        }}
      />
    </div>
  );
};
