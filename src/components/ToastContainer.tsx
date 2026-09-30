import React from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  tipo: 'success' | 'warning' | 'info' | 'error';
  mensaje: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-3">
      {toasts.map((toast) => {
        let borderClass = 'border-[#A57F2C]';
        let bgClass = 'bg-[#002F2A]/95';
        let icon = <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;

        if (toast.tipo === 'warning') {
          borderClass = 'border-amber-500';
          bgClass = 'bg-[#611232]/95';
          icon = <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />;
        } else if (toast.tipo === 'error') {
          borderClass = 'border-rose-500';
          bgClass = 'bg-rose-950/95';
          icon = <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />;
        } else if (toast.tipo === 'info') {
          borderClass = 'border-sky-500';
          bgClass = 'bg-[#051a17]/95';
          icon = <Info className="w-4 h-4 text-sky-400 shrink-0" />;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-xl shadow-2xl backdrop-blur-md border ${borderClass} ${bgClass} text-stone-100 text-xs sm:text-sm animate-slide-up transition-all`}
          >
            <div className="flex items-center gap-2.5">
              {icon}
              <span className="leading-tight font-medium">{toast.mensaje}</span>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-stone-400 hover:text-white p-1 rounded transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
