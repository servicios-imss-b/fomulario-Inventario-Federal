import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import type { PreguntaConfig } from '../../types/form';

interface GeographicRow {
  llave?: string;
  clave: string;
  entidad: string;
  claveMunicipio?: string;
  municipio?: string;
}

interface MatrixRowValue {
  total?: string;
  hombres?: string;
  mujeres?: string;
}

interface MatrixValue {
  rows?: Record<string, MatrixRowValue>;
}

interface MatrixQuestionProps {
  pregunta: PreguntaConfig;
  valor: MatrixValue | null;
  nivelGeografico: string;
  formaReporte: string;
  error?: string;
  onChange: (value: MatrixValue) => void;
}

const PAGE_SIZE = 30;
export function MatrixQuestion({ pregunta, valor, nivelGeografico, formaReporte, error, onChange }: MatrixQuestionProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [catalog, setCatalog] = useState<{ estatal: GeographicRow[]; municipal: GeographicRow[] } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import('../../data/matricesCuantificacion.json').then(({ default: data }) => {
      if (!cancelled) setCatalog(data as { estatal: GeographicRow[]; municipal: GeographicRow[] });
    });
    return () => { cancelled = true; };
  }, []);

  const isMunicipal = nivelGeografico === 'Municipal';
  const isDisaggregated = formaReporte === 'Desagregada por sexo';
  const sourceRows = catalog ? isMunicipal ? catalog.municipal : catalog.estatal : [];
  const searchableRows = sourceRows.filter((row) =>
    [row.clave, row.entidad, row.claveMunicipio, row.municipio, row.llave]
      .filter(Boolean)
      .some((value) => value!.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
  );
  const pageCount = Math.max(1, Math.ceil(searchableRows.length / PAGE_SIZE));
  const pageRows = searchableRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const matrixValues = valor?.rows ?? {};

  const updateValue = (row: GeographicRow, field: keyof MatrixRowValue, fieldValue: string) => {
    const rowKey = row.llave ?? row.clave;
    const existing = matrixValues[rowKey] ?? {};
    const nextRow: MatrixRowValue = { ...existing, [field]: fieldValue };
    if (isDisaggregated) {
      const hasSexValues = nextRow.hombres !== undefined || nextRow.mujeres !== undefined;
      nextRow.total = hasSexValues
        ? String(Number(nextRow.hombres || 0) + Number(nextRow.mujeres || 0))
        : '';
    }
    onChange({ rows: { ...matrixValues, [rowKey]: nextRow } });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-black">{pregunta.pregunta}</h3>
          <p className="mt-1 text-xs text-black/80">
            Plantilla {nivelGeografico} {formaReporte.toLocaleLowerCase()} · {sourceRows.length.toLocaleString('es-MX')} filas del Excel
          </p>
        </div>
        <label className="relative block w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
            placeholder={isMunicipal ? 'Buscar municipio o entidad' : 'Buscar entidad'}
            className="w-full rounded-md border border-white/15 bg-[#041a17] py-2 pl-9 pr-3 text-sm text-white placeholder:text-stone-400"
          />
        </label>
      </div>

      {!catalog && <p className="text-xs text-slate-600">Cargando catálogo geográfico…</p>}

      <div className="overflow-x-auto rounded-lg border border-[#A57F2C]/35">
        <table className="w-full min-w-[42rem] border-collapse text-left text-xs sm:text-sm">
          <thead className="sticky top-0 bg-[#002F2A] text-white">
            <tr>
              {isMunicipal && <th className="px-2 py-2 font-semibold">Llave</th>}
              <th className="px-2 py-2 font-semibold">Clave</th>
              <th className="px-2 py-2 font-semibold">Entidad</th>
              {isMunicipal && <th className="px-2 py-2 font-semibold">Clave Municipio</th>}
              {isMunicipal && <th className="px-2 py-2 font-semibold">Municipio</th>}
              {isDisaggregated && <th className="px-2 py-2 font-semibold">Hombres</th>}
              {isDisaggregated && <th className="px-2 py-2 font-semibold">Mujeres</th>}
              <th className="px-2 py-2 font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => {
              const rowKey = row.llave ?? row.clave;
              const values = matrixValues[rowKey] ?? {};
              const rowLabel = isMunicipal ? row.municipio : row.entidad;
              return (
                <tr key={rowKey} className="border-t border-white/15 odd:bg-white/5 even:bg-[#002F2A]/25">
                  {isMunicipal && <td className="px-2 py-1.5 font-mono text-black">{row.llave}</td>}
                  <td className="px-2 py-1.5 font-mono text-black">{row.clave}</td>
                  <td className="px-2 py-1.5 text-black">{row.entidad}</td>
                  {isMunicipal && <td className="px-2 py-1.5 font-mono text-black">{row.claveMunicipio}</td>}
                  {isMunicipal && <td className="px-2 py-1.5 text-black">{row.municipio}</td>}
                  {isDisaggregated && (
                    <>
                      <td className="px-2 py-1">
                        <input
                          aria-label={`Hombres ${rowLabel}`}
                          type="number"
                          min="0"
                          value={values.hombres ?? ''}
                          onChange={(event) => updateValue(row, 'hombres', event.target.value)}
                          className="w-24 rounded border border-white/20 bg-[#041a17] px-2 py-1.5 text-right text-white"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          aria-label={`Mujeres ${rowLabel}`}
                          type="number"
                          min="0"
                          value={values.mujeres ?? ''}
                          onChange={(event) => updateValue(row, 'mujeres', event.target.value)}
                          className="w-24 rounded border border-white/20 bg-[#041a17] px-2 py-1.5 text-right text-white"
                        />
                      </td>
                    </>
                  )}
                  <td className="px-2 py-1">
                    {isDisaggregated ? (
                      <span className="block w-24 px-2 py-1.5 text-right font-mono text-black">{values.total || ''}</span>
                    ) : (
                      <input
                        aria-label={`Total ${rowLabel}`}
                        type="number"
                        min="0"
                        value={values.total ?? ''}
                        onChange={(event) => updateValue(row, 'total', event.target.value)}
                        className="w-24 rounded border border-white/20 bg-[#041a17] px-2 py-1.5 text-right text-white"
                      />
                    )}
                  </td>
                </tr>
              );
            })}
            {pageRows.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-black">No hay coincidencias.</td></tr>}
          </tbody>
        </table>
      </div>

      <footer className="flex items-center justify-between gap-3 text-xs text-black">
        <span>{searchableRows.length === 0 ? 0 : page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, searchableRows.length)} de {searchableRows.length.toLocaleString('es-MX')}</span>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Página anterior" disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))} className="rounded border border-white/20 p-1.5 disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span>{page + 1} / {pageCount}</span>
          <button type="button" aria-label="Página siguiente" disabled={page + 1 >= pageCount} onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))} className="rounded border border-white/20 p-1.5 disabled:opacity-40">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </footer>
      {error && <p role="alert" className="text-xs font-medium text-rose-600">{error}</p>}
    </div>
  );
}