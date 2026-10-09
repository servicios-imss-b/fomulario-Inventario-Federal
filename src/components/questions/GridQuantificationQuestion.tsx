import React from 'react';
import { PreguntaConfig } from '../../types/form';
import { Building2, Users } from 'lucide-react';

interface GridQuantificationProps {
  pregunta: PreguntaConfig;
  valor: any; // { forma: 'Agregada' | 'Desagregada por sexo', total: number, mujeres?: number, hombres?: number, entidad?: string, notas?: string }
  formaReporte?: string;
  nivelGeografico?: string;
  error?: string;
  onChange: (valor: any) => void;
}

const ENTIDADES_FEDERATIVAS = [
  'Nacional / Cobertura Multientidad',
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche',
  'Chiapas', 'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima',
  'Durango', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco',
  'México', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León',
  'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí',
  'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala',
  'Veracruz', 'Yucatán', 'Zacatecas'
];

export const GridQuantificationQuestion: React.FC<GridQuantificationProps> = ({
  pregunta,
  valor = {},
  formaReporte = 'Agregada',
  nivelGeografico = 'Estatal',
  error,
  onChange,
}) => {
  const current = typeof valor === 'object' && valor !== null ? valor : {};
  const isPorSexo = formaReporte === 'Desagregada por sexo';

  const updateField = (field: string, val: any) => {
    onChange({
      ...current,
      forma: formaReporte,
      [field]: val,
    });
  };

  const total = Number(current.total || 0);
  const mujeres = Number(current.mujeres || 0);
  const hombres = Number(current.hombres || 0);
  const sumaCoincide = !isPorSexo || (mujeres + hombres === 0) || (mujeres + hombres === total);

  return (
    <div className="space-y-3 p-4 rounded-xl bg-[#002F2A]/45 backdrop-blur-md border border-[#A57F2C]/30 shadow-inner">
      <div className="flex items-center gap-2 text-black font-semibold text-sm sm:text-base border-b border-[#A57F2C]/20 pb-2">
        <Building2 className="w-5 h-5 text-[#A57F2C]" />
        <span>{pregunta.pregunta}</span>
      </div>

      <p className="text-xs font-semibold text-black">
        Base de captura seleccionada: {nivelGeografico}
      </p>

      {pregunta.instruccion && (
        <p className="text-xs text-black/90 italic">{pregunta.instruccion}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        {/* Entidad / Ámbito geográfico */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-black">
            Entidad Federativa o Ámbito Territorial:
          </label>
          <select
            value={current.entidad || ''}
            onChange={(e) => updateField('entidad', e.target.value)}
            className="animated-select w-full px-3 py-2 rounded-lg glass-input text-xs sm:text-sm text-stone-100"
          >
            <option value="" disabled className="bg-[#002F2A]">
              Seleccione la Entidad o Cobertura ▾
            </option>
            {ENTIDADES_FEDERATIVAS.map((ent, i) => (
              <option key={i} value={ent} className="bg-[#002F2A]">
                {ent}
              </option>
            ))}
          </select>
        </div>

        {nivelGeografico === 'Municipal' && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-black">Municipio:</label>
            <input
              value={current.municipio || ''}
              onChange={(event) => updateField('municipio', event.target.value)}
              maxLength={120}
              placeholder="Nombre del municipio"
              className="w-full rounded-lg glass-input px-3 py-2 text-xs text-stone-100 sm:text-sm"
            />
          </div>
        )}

        {/* Total General */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-black flex items-center justify-between">
            <span>Población Total Cuantificada:</span>
            <Users className="w-3.5 h-3.5 text-[#A57F2C]" />
          </label>
          <input
            type="number"
            min="0"
            value={current.total ?? ''}
            onChange={(e) => updateField('total', e.target.value)}
            placeholder="0"
            className="w-full px-3 py-2 rounded-lg glass-input text-xs sm:text-sm text-stone-100 font-mono"
          />
        </div>
      </div>

      {/* Desglose por Sexo si se seleccionó en pregunta 37 */}
      {isPorSexo && (
        <div className="p-3 rounded-lg bg-[#611232]/30 border border-[#A57F2C]/20 space-y-3">
          <div className="text-xs font-bold text-[#A57F2C] uppercase tracking-wider">
            Desagregación por Sexo (INEGI)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-black">Mujeres atendidas:</label>
              <input
                type="number"
                min="0"
                value={current.mujeres ?? ''}
                onChange={(e) => updateField('mujeres', e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 rounded-lg glass-input text-xs sm:text-sm text-stone-100 font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-black">Hombres atendidos:</label>
              <input
                type="number"
                min="0"
                value={current.hombres ?? ''}
                onChange={(e) => updateField('hombres', e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 rounded-lg glass-input text-xs sm:text-sm text-stone-100 font-mono"
              />
            </div>
          </div>
          {!sumaCoincide && total > 0 && (
            <p className="text-[11px] text-amber-300">
              Aviso: La suma de Mujeres ({mujeres}) y Hombres ({hombres}) es {mujeres + hombres}, la cual difiere del total reportado ({total}).
            </p>
          )}
        </div>
      )}

      {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}
    </div>
  );
};
