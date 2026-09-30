import React, { useState } from 'react';
import { DatosUsuario } from '../types/form';
import { User, Mail, Building, Phone, Briefcase, Calendar, ArrowRight, ShieldAlert } from 'lucide-react';

interface UserDataSectionProps {
  initialData: DatosUsuario;
  onContinue: (data: DatosUsuario) => void;
  onBackToLanding?: () => void;
}

export const UserDataSection: React.FC<UserDataSectionProps> = ({
  initialData,
  onContinue,
  onBackToLanding,
}) => {
  const [formData, setFormData] = useState<DatosUsuario>({
    nombre: initialData?.nombre || '',
    puesto: initialData?.puesto || '',
    correo: initialData?.correo || '',
    telefono: initialData?.telefono || '',
    entidadDependencia: initialData?.entidadDependencia || '',
    fechaCaptura: initialData?.fechaCaptura || new Date().toISOString().split('T')[0],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!formData.nombre.trim()) {
      errs.nombre = 'El nombre completo es obligatorio.';
    } else if (formData.nombre.length > 300) {
      errs.nombre = 'Máximo 300 caracteres permitidos.';
    }

    if (!formData.correo.trim()) {
      errs.correo = 'El correo electrónico es obligatorio.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correo)) {
      errs.correo = 'Ingrese un formato de correo electrónico válido.';
    }

    if (!formData.puesto.trim()) {
      errs.puesto = 'El puesto o cargo es obligatorio.';
    }

    if (!formData.entidadDependencia.trim()) {
      errs.entidadDependencia = 'La entidad o dependencia es obligatoria.';
    }

    if (!formData.telefono.trim()) {
      errs.telefono = 'El teléfono de contacto es obligatorio.';
    }

    if (!formData.fechaCaptura) {
      errs.fechaCaptura = 'La fecha de captura es obligatoria.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onContinue(formData);
    }
  };

  return (
    <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="max-w-2xl w-full glass-institutional rounded-2xl p-6 sm:p-8 md:p-10 border border-[#A57F2C]/30 shadow-2xl space-y-6">
        {/* Encabezado */}
        <div className="border-b border-[#A57F2C]/30 pb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#611232]/80 border border-[#A57F2C]/40 text-[#A57F2C] text-xs font-semibold uppercase tracking-wider mb-2">
            <User className="w-3.5 h-3.5" />
            <span>Paso Previo Obligatorio</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-100">
            DATOS DEL USUARIO
          </h2>
          <p className="text-xs sm:text-sm text-stone-300 mt-1">
            Registre los datos de la persona servidora pública responsable de capturar la información en el sistema.
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-1">
            <label className="text-xs sm:text-sm font-medium text-stone-200 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#A57F2C]" />
              <span>Nombre completo</span>
              <span className="text-rose-400 font-bold">*</span>
            </label>
            <input
              type="text"
              maxLength={300}
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Nombre y apellidos"
              className={`w-full px-3.5 py-2.5 rounded-lg glass-input text-sm text-stone-100 ${
                errors.nombre ? 'border-rose-500' : ''
              }`}
            />
            {errors.nombre && <p className="text-xs text-rose-400">{errors.nombre}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Puesto */}
            <div className="space-y-1">
              <label className="text-xs sm:text-sm font-medium text-stone-200 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-[#A57F2C]" />
                <span>Puesto / Cargo institucional</span>
                <span className="text-rose-400 font-bold">*</span>
              </label>
              <input
                type="text"
                maxLength={300}
                value={formData.puesto}
                onChange={(e) => setFormData({ ...formData, puesto: e.target.value })}
                placeholder="Ej. Subdirector de Evaluación"
                className={`w-full px-3.5 py-2.5 rounded-lg glass-input text-sm text-stone-100 ${
                  errors.puesto ? 'border-rose-500' : ''
                }`}
              />
              {errors.puesto && <p className="text-xs text-rose-400">{errors.puesto}</p>}
            </div>

            {/* Entidad / Dependencia */}
            <div className="space-y-1">
              <label className="text-xs sm:text-sm font-medium text-stone-200 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-[#A57F2C]" />
                <span>Entidad o Dependencia</span>
                <span className="text-rose-400 font-bold">*</span>
              </label>
              <input
                type="text"
                maxLength={300}
                value={formData.entidadDependencia}
                onChange={(e) => setFormData({ ...formData, entidadDependencia: e.target.value })}
                placeholder="Ej. Secretaría de Bienestar"
                className={`w-full px-3.5 py-2.5 rounded-lg glass-input text-sm text-stone-100 ${
                  errors.entidadDependencia ? 'border-rose-500' : ''
                }`}
              />
              {errors.entidadDependencia && (
                <p className="text-xs text-rose-400">{errors.entidadDependencia}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Correo Electrónico */}
            <div className="space-y-1">
              <label className="text-xs sm:text-sm font-medium text-stone-200 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#A57F2C]" />
                <span>Correo electrónico institucional</span>
                <span className="text-rose-400 font-bold">*</span>
              </label>
              <input
                type="email"
                maxLength={300}
                value={formData.correo}
                onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                placeholder="usuario@dependencia.gob.mx"
                className={`w-full px-3.5 py-2.5 rounded-lg glass-input text-sm text-stone-100 ${
                  errors.correo ? 'border-rose-500' : ''
                }`}
              />
              {errors.correo && <p className="text-xs text-rose-400">{errors.correo}</p>}
            </div>

            {/* Teléfono */}
            <div className="space-y-1">
              <label className="text-xs sm:text-sm font-medium text-stone-200 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#A57F2C]" />
                <span>Teléfono de contacto</span>
                <span className="text-rose-400 font-bold">*</span>
              </label>
              <input
                type="tel"
                maxLength={300}
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                placeholder="10 dígitos con clave LADA"
                className={`w-full px-3.5 py-2.5 rounded-lg glass-input text-sm text-stone-100 ${
                  errors.telefono ? 'border-rose-500' : ''
                }`}
              />
              {errors.telefono && <p className="text-xs text-rose-400">{errors.telefono}</p>}
            </div>
          </div>

          {/* Fecha de captura */}
          <div className="space-y-1">
            <label className="text-xs sm:text-sm font-medium text-stone-200 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#A57F2C]" />
              <span>Fecha de captura</span>
              <span className="text-rose-400 font-bold">*</span>
            </label>
            <input
              type="date"
              value={formData.fechaCaptura}
              onChange={(e) => setFormData({ ...formData, fechaCaptura: e.target.value })}
              className={`w-full sm:max-w-xs px-3.5 py-2.5 rounded-lg glass-input text-sm text-stone-100 ${
                errors.fechaCaptura ? 'border-rose-500' : ''
              }`}
            />
            {errors.fechaCaptura && <p className="text-xs text-rose-400">{errors.fechaCaptura}</p>}
          </div>

          {/* Botones */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#A57F2C]/30">
            {onBackToLanding && (
              <button
                type="button"
                onClick={onBackToLanding}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg text-xs sm:text-sm font-medium text-stone-300 hover:text-white hover:bg-white/5 border border-stone-600 transition"
              >
                ← Regresar al inicio
              </button>
            )}

            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-3 rounded-xl font-semibold text-sm text-stone-900 bg-gradient-to-r from-[#A57F2C] to-[#d4aa48] hover:from-[#d4aa48] hover:to-[#A57F2C] shadow-lg flex items-center justify-center gap-2 cursor-pointer transition hover:scale-[1.02] ml-auto"
            >
              <span>CONTINUAR A LAS PREGUNTAS</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
