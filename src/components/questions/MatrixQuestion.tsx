import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, FileSpreadsheet, Search, Upload } from 'lucide-react';
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
  const [importFeedback, setImportFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

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

  const importExcel = async (file: File) => {
    setImportFeedback(null);
    if (!/\.xlsx$/i.test(file.name)) {
      setImportFeedback({ type: 'error', message: 'Seleccione un archivo de Excel .xlsx.' });
      return;
    }

    try {
      const { default: readXlsxFile } = await import('read-excel-file/browser');
      const sheets = await readXlsxFile(file);
      const worksheetRows = sheets[0]?.data;
      if (!Array.isArray(worksheetRows)) throw new Error('El archivo no contiene una hoja de cálculo válida.');
      const headerValues = worksheetRows[0] ?? [];
      const headers = headerValues.map((header) => String(header ?? ''));
      const importedRows = worksheetRows.slice(1).map((cells) =>
        Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']))
      ) as Array<Record<string, unknown>>;
      if (importedRows.length === 0) throw new Error('La hoja de Excel no contiene filas para importar.');

      const normalizeHeader = (value: unknown) => String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      const findHeader = (aliases: string[]) => headers.find((header) => aliases.includes(normalizeHeader(header)));
      const keyHeader = findHeader(['llave', 'llavegeografica', 'identificadorgeografico', 'cvegeo']);
      const entityCodeHeader = findHeader(['claveentidad', 'cveent', 'claveestado', 'clave']);
      const municipalityCodeHeader = findHeader(['clavemunicipio', 'cvemun', 'municipioclave']);
      const entityNameHeader = findHeader(['entidad', 'estado', 'entidadfederativa']);
      const municipalityNameHeader = findHeader(['municipio', 'nombremunicipio']);
      const totalHeader = findHeader(['total', 'cantidad', 'cuantificacion', 'poblacionatendida']);
      const menHeader = findHeader(['hombres', 'hombresatendidos', 'masculino']);
      const womenHeader = findHeader(['mujeres', 'mujeresatendidas', 'femenino']);

      if (isMunicipal) {
        const hasCompositeCode = Boolean(entityCodeHeader && municipalityCodeHeader);
        const hasCompositeName = Boolean(entityNameHeader && municipalityNameHeader);
        if (!keyHeader && !hasCompositeCode && !hasCompositeName) {
          throw new Error('Para nivel municipal incluya Llave o las columnas Clave entidad y Clave municipio (también se aceptan sus nombres).');
        }
      } else if (!keyHeader && !entityCodeHeader && !entityNameHeader) {
        throw new Error('Para nivel estatal incluya una columna Clave o Entidad.');
      }

      if (isDisaggregated && (!menHeader || !womenHeader)) {
        throw new Error('Para la captura desagregada, Excel debe incluir las columnas Hombres y Mujeres.');
      }
      if (!isDisaggregated && !totalHeader) {
        throw new Error('Para la captura agregada, Excel debe incluir una columna Total.');
      }

      const normalizeText = (value: unknown) => normalizeHeader(value);
      const sameCode = (left: unknown, right: unknown) => {
        const first = String(left ?? '').trim().replace(/\.0$/, '');
        const second = String(right ?? '').trim().replace(/\.0$/, '');
        if (!first || !second) return false;
        if (first === second) return true;
        return /^\d+$/.test(first) && /^\d+$/.test(second) && Number(first) === Number(second);
      };
      const parseQuantity = (value: unknown, rowNumber: number, columnName: string): string => {
        const raw = String(value ?? '').trim().replace(/,/g, '');
        const amount = Number(raw);
        if (!raw || !Number.isFinite(amount) || amount < 0) {
          throw new Error(`Fila ${rowNumber}: el valor de «${columnName}» debe ser un número igual o mayor que cero.`);
        }
        return String(amount);
      };
      const nextRows = { ...matrixValues };
      let importedCount = 0;

      importedRows.forEach((source, index) => {
        const rowNumber = index + 2;
        const rowKeyValue = keyHeader ? source[keyHeader] : '';
        const entityCode = entityCodeHeader ? source[entityCodeHeader] : '';
        const municipalityCode = municipalityCodeHeader ? source[municipalityCodeHeader] : '';
        const entityName = entityNameHeader ? source[entityNameHeader] : '';
        const municipalityName = municipalityNameHeader ? source[municipalityNameHeader] : '';
        const rowHasValues = [rowKeyValue, entityCode, municipalityCode, entityName, municipalityName, source[totalHeader ?? ''], source[menHeader ?? ''], source[womenHeader ?? '']]
          .some((value) => String(value ?? '').trim() !== '');
        if (!rowHasValues) return;

        const geographicRow = sourceRows.find((row) => {
          if (!isMunicipal) {
            return keyHeader
              ? sameCode(row.clave, rowKeyValue)
              : entityCodeHeader
                ? sameCode(row.clave, entityCode)
                : normalizeText(row.entidad) === normalizeText(entityName);
          }
          if (keyHeader) return sameCode(row.llave, rowKeyValue) || sameCode(row.claveMunicipio, rowKeyValue);
          if (entityCodeHeader && municipalityCodeHeader) {
            return sameCode(row.clave, entityCode) && sameCode(row.claveMunicipio, municipalityCode);
          }
          return normalizeText(row.entidad) === normalizeText(entityName)
            && normalizeText(row.municipio) === normalizeText(municipalityName);
        });
        if (!geographicRow) throw new Error(`Fila ${rowNumber}: no se encontró la clave o localidad en el catálogo seleccionado.`);

        const matrixKey = geographicRow.llave ?? geographicRow.clave;
        const nextValue: MatrixRowValue = { ...nextRows[matrixKey] };
        if (isDisaggregated) {
          nextValue.hombres = parseQuantity(source[menHeader!], rowNumber, menHeader!);
          nextValue.mujeres = parseQuantity(source[womenHeader!], rowNumber, womenHeader!);
          nextValue.total = String(Number(nextValue.hombres) + Number(nextValue.mujeres));
        } else {
          nextValue.total = parseQuantity(source[totalHeader!], rowNumber, totalHeader!);
        }
        nextRows[matrixKey] = nextValue;
        importedCount++;
      });

      if (importedCount === 0) throw new Error('No se encontraron filas válidas para importar.');
      onChange({ rows: nextRows });
      setPage(0);
      setImportFeedback({ type: 'success', message: `Se importaron ${importedCount} registros. Puedes revisarlos y editarlos en la tabla.` });
    } catch (importError) {
      setImportFeedback({
        type: 'error',
        message: importError instanceof Error ? importError.message : 'No se pudo leer el archivo de Excel.',
      });
    } finally {
      if (excelInputRef.current) excelInputRef.current.value = '';
    }
  };

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

      {sourceRows.length > PAGE_SIZE && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-white/10 bg-white/5 px-3 py-2.5">
          <input
            ref={excelInputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            aria-label="Importar cuantificaciones desde Excel"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importExcel(file);
            }}
          />
          <button
            type="button"
            onClick={() => excelInputRef.current?.click()}
            className="inline-flex min-h-9 items-center gap-2 rounded-md border border-[#A57F2C]/50 bg-[#002f2a] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#005247] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d5b66a]"
          >
            <FileSpreadsheet className="h-4 w-4 text-[#e2bd68]" />
            Cargar más de 30 registros desde Excel
            <Upload className="h-3.5 w-3.5" />
          </button>
          <p className="text-[11px] leading-relaxed text-stone-300">
            Excel .xlsx: incluya Llave o Clave entidad + Clave municipio; agregue Total o Hombres y Mujeres.
          </p>
        </div>
      )}
      {importFeedback && (
        <p role={importFeedback.type === 'error' ? 'alert' : 'status'} className={`text-xs font-medium ${importFeedback.type === 'error' ? 'text-rose-300' : 'text-emerald-300'}`}>
          {importFeedback.message}
        </p>
      )}

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