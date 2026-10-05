import React from 'react';

interface LoadingOverlayProps {
  title: string;
  message: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ title, message }) => (
  <div
    className="pill-loading-overlay fixed inset-0 z-[100] flex items-center justify-center px-5"
    role="status"
    aria-live="polite"
    aria-label={`${title}. ${message}`}
  >
    <div className="pill-loading-panel w-full max-w-xl px-6 py-8 text-center sm:px-10">
      <div className="pill-loader-content mx-auto" aria-hidden="true">
        <div className="pill-loader">
          <div className="pill-loader-medicine">
            {Array.from({ length: 20 }, (_, index) => <i key={index} />)}
          </div>
          <div className="pill-loader-side" />
          <div className="pill-loader-side" />
        </div>
      </div>
      <span className="sr-only">{title}. {message}. Por favor espera.</span>
    </div>
  </div>
);
