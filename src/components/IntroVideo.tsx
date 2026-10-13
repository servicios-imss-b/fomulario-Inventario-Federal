import React, { useState } from 'react';
import { SkipForward } from 'lucide-react';

interface IntroVideoProps {
  onComplete: () => void;
}

export const IntroVideo: React.FC<IntroVideoProps> = ({ onComplete }) => {
  const [videoError, setVideoError] = useState(false);

  return (
    <section
      className="fixed inset-0 z-[100] isolate overflow-hidden bg-black"
      aria-label="Introducción del cuestionario"
    >
      <div className="absolute inset-0 overflow-hidden bg-black" aria-hidden="true">
        <video
          className="pointer-events-none h-full w-full scale-110 object-cover opacity-100 blur-xl"
          src="/video-intro.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          tabIndex={-1}
        />
      </div>
      <video
        className="pointer-events-none relative z-10 h-full w-full bg-transparent object-contain"
        src="/video-intro.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
        aria-label="Video de introducción del cuestionario"
        onEnded={onComplete}
        onError={() => setVideoError(true)}
      />
      {videoError && (
        <p role="status" className="absolute bottom-6 left-6 max-w-[70vw] text-sm text-white">
          No fue posible reproducir la introducción.
        </p>
      )}
      <button
        type="button"
        onClick={onComplete}
        className="absolute right-5 top-5 z-20 inline-flex min-h-11 items-center gap-2 rounded-md border border-white/60 bg-black/80 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-8 sm:top-8"
        aria-label="Saltar animación y continuar al cuestionario"
      >
        Saltar animación
        <SkipForward className="h-4 w-4" aria-hidden="true" />
      </button>
    </section>
  );
};