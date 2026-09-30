import React from 'react';

interface LoadingOverlayProps {
  title: string;
  message: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ title, message }) => (
  <div
    className="fixed inset-0 z-[100] flex items-center justify-center bg-[#ececec] px-5"
    role="status"
    aria-live="polite"
    aria-label={`${title}. ${message}`}
  >
    <div className="w-full max-w-xl rounded-2xl border border-[#1E5B4F]/15 bg-white px-6 py-8 text-center text-[#1E5B4F] shadow-[0_18px_50px_rgba(30,91,79,0.14)] sm:px-10">
      <svg
        className="mx-auto h-auto w-full max-w-xl text-[#1E5B4F]"
        viewBox="0 0 298 53.9"
        aria-hidden="true"
      >
        <path
          className="completion-heartbeat-path"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
          d="M0 27h72c5 0 7-2 10-2h10l7 5 10-1 9-21 11 42 13-47 12 27h9l8-3 8 3h35c6 0 8-5 14-5h8l7 5h55"
        />
      </svg>
      <h2 className="mt-5 text-xl font-semibold tracking-wide sm:text-2xl">{title}</h2>
      <p className="mt-2 text-sm text-[#1E5B4F]/80 sm:text-base">
        {message}
        <span className="completion-loading-dots" aria-hidden="true" />
      </p>
      <span className="sr-only">Por favor espera.</span>
    </div>
  </div>
);
