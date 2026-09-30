import React from 'react';
import { AlertCircle, CheckCircle, ShieldCheck } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  isSubmitting,
  onCancel,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative max-w-md w-full glass-institutional rounded-2xl p-6 sm:p-8 border border-[#A57F2C]/50 shadow-2xl space-y-6 text-center">
        {/* Ícono */}
        <div className="w-16 h-16 rounded-full bg-[#611232] border-2 border-[#A57F2C] flex items-center justify-center mx-auto text-[#A57F2C] shadow-lg">
          <ShieldCheck className="w-8 h-8" />
        </div>

        {/* Textos */}
        <div className="space-y-2">
          <h3 className="text-xl sm:text-2xl font-serif font-bold text-stone-100">
            ¿Deseas finalizar el formulario?
          </h3>
          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
            Una vez enviado podrás consultar el registro posteriormente y se generará tu comprobante oficial con número de folio institucional.
          </p>
        </div>

        {/* Botones */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="w-full sm:w-1/2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-stone-300 hover:text-white bg-stone-800/80 hover:bg-stone-700/80 border border-stone-600 transition cursor-pointer"
          >
            CANCELAR
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="w-full sm:w-1/2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-[#002F2A] bg-[#A57F2C] hover:bg-[#c4993a] border border-[#A57F2C] shadow-lg flex items-center justify-center gap-2 transition cursor-pointer"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin"></span>
                Enviando...
              </span>
            ) : (
              <span>FINALIZAR</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
