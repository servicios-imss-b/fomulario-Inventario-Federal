import { Plus, Trash2 } from 'lucide-react';
import type { PreguntaConfig } from '../../types/form';

interface QuantificationRow {
  unit: string;
  quantity: string;
}

interface RepeatableQuantificationValue {
  rows: QuantificationRow[];
}

interface RepeatableQuantificationQuestionProps {
  pregunta: PreguntaConfig;
  valor: RepeatableQuantificationValue | null;
  error?: string;
  onChange: (value: RepeatableQuantificationValue) => void;
}

export function RepeatableQuantificationQuestion({ pregunta, valor, error, onChange }: RepeatableQuantificationQuestionProps) {
  const rows = valor?.rows?.length ? valor.rows : [{ unit: '', quantity: '' }];
  const questionNumber = pregunta.id === '18' ? '18' : '16';

  const updateRow = (index: number, field: keyof QuantificationRow, fieldValue: string) => {
    const nextRows = rows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: fieldValue } : row);
    onChange({ rows: nextRows });
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-black">{pregunta.pregunta}</h3>
        {pregunta.instruccion && <p className="mt-1 text-xs text-black/80">{pregunta.instruccion}</p>}
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-900/15">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <thead className="bg-[#002F2A] text-white">
            <tr>
              <th className="px-3 py-2 font-semibold">{questionNumber}.1 Unidad de medida</th>
              <th className="px-3 py-2 font-semibold">{questionNumber}.2 Cuantificación</th>
              <th className="w-14 px-2 py-2"><span className="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody className="bg-white/5">
            {rows.map((row, index) => (
              <tr key={index} className="border-t border-slate-900/10">
                <td className="p-2">
                  <input
                    aria-label={`Unidad de medida, fila ${index + 1}`}
                    value={row.unit}
                    onChange={(event) => updateRow(index, 'unit', event.target.value)}
                    maxLength={300}
                    placeholder="Personas, hogares, instituciones..."
                    className="w-full rounded-md border border-white/15 bg-[#041a17] px-3 py-2 text-sm text-white placeholder:text-stone-400"
                  />
                </td>
                <td className="p-2">
                  <input
                    aria-label={`Cuantificación, fila ${index + 1}`}
                    type="number"
                    min="0"
                    value={row.quantity}
                    onChange={(event) => updateRow(index, 'quantity', event.target.value)}
                    placeholder="0"
                    className="w-full rounded-md border border-white/15 bg-[#041a17] px-3 py-2 text-sm text-white placeholder:text-stone-400"
                  />
                </td>
                <td className="p-2 text-center">
                  <button
                    type="button"
                    aria-label={`Eliminar fila ${index + 1}`}
                    disabled={rows.length === 1}
                    onClick={() => onChange({ rows: rows.filter((_, rowIndex) => rowIndex !== index) })}
                    className="inline-flex rounded p-1.5 text-rose-300 hover:bg-rose-950/40 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && <p role="alert" className="text-xs font-medium text-rose-600">{error}</p>}
      <button
        type="button"
        onClick={() => onChange({ rows: [...rows, { unit: '', quantity: '' }] })}
        className="inline-flex items-center gap-1.5 rounded-md bg-[#003d35] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#002f2a]"
      >
        <Plus className="h-3.5 w-3.5" />
        Nuevo
      </button>
    </div>
  );
}