import { useEffect, useState } from 'react';
import type { TableColumn, TableRow } from './types';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Download, Search } from 'lucide-react';

interface TableFrontProps {
  columns: TableColumn[];
  rows: TableRow[];
  selectedRowId?: string | null;
  onSelectRow?: (rowId: string) => void;
}

export function TableFront({ columns, rows, selectedRowId, onSelectRow }: TableFrontProps) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState(columns[0]?.key ?? '');
  const [ascending, setAscending] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 15;

  const filteredRows = rows.filter((row) =>
    columns.some((column) => row[column.key].toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
  );
  const sortedRows = [...filteredRows].sort((left, right) => {
    const comparison = (left[sortKey] ?? '').localeCompare(right[sortKey] ?? '', 'es', {
      numeric: true,
      sensitivity: 'base',
    });
    return ascending ? comparison : -comparison;
  });
  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const visibleRows = sortedRows.slice(page * pageSize, (page + 1) * pageSize);

  useEffect(() => setPage(0), [search]);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setAscending((current) => !current);
    } else {
      setSortKey(key);
      setAscending(true);
    }
  };

  const downloadCsv = () => {
    const escapeCsv = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const content = [
      columns.map((column) => escapeCsv(column.label)).join(','),
      ...sortedRows.map((row) => columns.map((column) => escapeCsv(row[column.key] ?? '')).join(',')),
    ].join('\r\n');
    const file = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'formularios.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const firstRecord = sortedRows.length === 0 ? 0 : page * pageSize + 1;
  const lastRecord = Math.min((page + 1) * pageSize, sortedRows.length);

  return (
    <section className="overflow-hidden rounded-xl border border-stone-200 bg-white text-stone-800 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-4 py-3">
        <label className="relative block w-full max-w-sm">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar en formularios..."
            className="w-full rounded-lg border border-stone-200 bg-stone-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-emerald-700/50 focus:bg-white"
          />
        </label>
        <button
          type="button"
          onClick={downloadCsv}
          disabled={sortedRows.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download aria-hidden="true" className="h-3.5 w-3.5" />
          Descargar CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50">
              {columns.map((column) => (
                <th key={column.key} scope="col" className="whitespace-nowrap px-4 py-3 text-left">
                  <button
                    type="button"
                    onClick={() => toggleSort(column.key)}
                    aria-label={`Ordenar por ${column.label}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold uppercase text-stone-500"
                  >
                    {column.label}
                    {sortKey === column.key
                      ? ascending ? <ArrowUp aria-hidden="true" className="h-3 w-3" /> : <ArrowDown aria-hidden="true" className="h-3 w-3" />
                      : <ArrowUpDown aria-hidden="true" className="h-3 w-3 opacity-40" />}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr
                key={row.id}
                tabIndex={onSelectRow ? 0 : undefined}
                aria-selected={selectedRowId === row.id}
                onClick={() => onSelectRow?.(row.id)}
                onKeyDown={(event) => {
                  if (onSelectRow && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    onSelectRow(row.id);
                  }
                }}
                className={`border-b border-stone-100 ${onSelectRow ? 'cursor-pointer hover:bg-emerald-50/70 focus:bg-emerald-50/70 focus:outline-none' : ''} ${selectedRowId === row.id ? 'bg-emerald-50' : ''}`}
              >
                {columns.map((column) => (
                  <td key={column.key} className="max-w-[22rem] whitespace-pre-wrap break-words px-4 py-3 align-top">
                    {row[column.key] || '—'}
                  </td>
                ))}
              </tr>
            ))}
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-16 text-center text-sm text-stone-400">
                  {search ? 'No hay coincidencias.' : 'Sin registros para mostrar.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 bg-stone-50/70 px-4 py-3">
        <span className="text-xs text-stone-500">{firstRecord}–{lastRecord} de {sortedRows.length} registros</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Página anterior"
            disabled={page === 0}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            className="rounded-lg border border-stone-200 p-1.5 text-stone-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          </button>
          <span className="text-xs tabular-nums text-stone-500">{page + 1} / {pageCount}</span>
          <button
            type="button"
            aria-label="Página siguiente"
            disabled={page + 1 >= pageCount}
            onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
            className="rounded-lg border border-stone-200 p-1.5 text-stone-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </footer>
    </section>
  );
}