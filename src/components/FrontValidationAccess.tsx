import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, LockKeyhole } from 'lucide-react';
import { supabaseClient } from '../services/supabaseClient';
import { FormAccessAdmin } from './admin/FormAccessAdmin';

interface FrontValidationAccessProps {
  onClose: () => void;
}

type ReportRow = Record<string, string | number>;
type ReportResult = { rows: ReportRow[] } | { error: string; authFailed: boolean };
type CachedReport = { rows: ReportRow[]; updatedAt: string };

const reportCacheKey = (username: string) => `reporte-relacional-v1:${username.trim().toLowerCase()}`;

function readCachedReport(username: string): CachedReport | null {
  try {
    const cached = window.sessionStorage.getItem(reportCacheKey(username));
    if (!cached) return null;
    const parsed = JSON.parse(cached) as Partial<CachedReport>;
    if (!Array.isArray(parsed.rows) || typeof parsed.updatedAt !== 'string') return null;
    return { rows: parsed.rows as ReportRow[], updatedAt: parsed.updatedAt };
  } catch {
    return null;
  }
}

async function fetchReport(username: string, password: string): Promise<ReportResult> {
  if (!supabaseClient) return { error: 'No está configurada la conexión a Supabase.', authFailed: false };
  const { data, error } = await supabaseClient.rpc('obtener_reporte_relacional', { p_usuario: username, p_password: password });
  if (error) return { error: 'No fue posible consultar el reporte en Supabase.', authFailed: false };
  if (!data?.success || !Array.isArray(data.rows)) {
    return { error: data?.error || 'Usuario o contraseña incorrectos.', authFailed: true };
  }
  return { rows: data.rows as ReportRow[] };
}

export function FrontValidationAccess({ onClose }: FrontValidationAccessProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const credentialsRef = useRef<{ username: string; password: string } | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isManagingAccess, setIsManagingAccess] = useState(false);
  const [reportRows, setReportRows] = useState<ReportRow[]>([]);
  const [reportDataMessage, setReportDataMessage] = useState('');
  const [updatedAt, setUpdatedAt] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refreshReport = useCallback(async () => {
    const credentials = credentialsRef.current;
    if (!credentials) return;
    try {
      const result = await fetchReport(credentials.username, credentials.password);
      if ('rows' in result) {
        const refreshedAt = new Date().toISOString();
        setReportRows(result.rows);
        setReportDataMessage('');
        setUpdatedAt(refreshedAt);
        try {
          window.sessionStorage.setItem(reportCacheKey(credentials.username), JSON.stringify({ rows: result.rows, updatedAt: refreshedAt }));
        } catch {
          // Keep the refreshed rows in memory if this browser blocks session storage.
        }
      } else {
        setReportDataMessage(result.error);
      }
    } catch {
      setReportDataMessage('No fue posible actualizar los datos. Se reintentará en unos segundos.');
    }
  }, []);

  useEffect(() => {
    const sendData = () => {
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'supabase-relational-data', rows: reportRows, error: reportDataMessage, updatedAt },
        window.location.origin,
      );
    };

    const handleReportMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type === 'reporte-new-ready') sendData();
      if (event.data?.type === 'reporte-new-refresh') void refreshReport();
    };

    window.addEventListener('message', handleReportMessage);
    if (isAuthenticated) sendData();
    return () => window.removeEventListener('message', handleReportMessage);
  }, [isAuthenticated, reportRows, reportDataMessage, updatedAt, refreshReport]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      if (!supabaseClient) {
        setError('No está configurada la conexión a Supabase.');
        return;
      }
      const { data, error: validationError } = await supabaseClient.rpc('validar_reporte_relacional', {
        p_usuario: username,
        p_password: password,
      });
      if (validationError) {
        setError('No fue posible validar el acceso al reporte.');
      } else if (data?.success) {
        credentialsRef.current = { username, password };
        setPassword('');
        const cached = readCachedReport(username);
        setReportRows(cached?.rows ?? []);
        setReportDataMessage('');
        setUpdatedAt(cached?.updatedAt ?? '');
        setIsAuthenticated(true);
      } else {
        setError(data?.error || 'Usuario o contraseña incorrectos.');
      }
    } catch {
      setError('No fue posible conectar con Supabase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthenticated) {
    const isSuperUser = username.trim().toLowerCase() === 'add.31';
    return (
      <div className="fixed inset-0 z-[100]">
        <iframe
          ref={iframeRef}
          title="Reporte de situación hospitalaria"
          src={`${import.meta.env.BASE_URL}reporte-new/index.html`}
          onLoad={() => iframeRef.current?.contentWindow?.postMessage(
            { type: 'supabase-relational-data', rows: reportRows, error: reportDataMessage, updatedAt },
            window.location.origin,
          )}
          className="absolute inset-0 block h-full w-full border-0 bg-gray-50"
        />
        {!isManagingAccess && (
          <div className="fixed right-4 top-4 z-[110] flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-md border border-slate-900/20 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-lg transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Salir del reporte
            </button>
            {isSuperUser && (
              <button
                type="button"
                onClick={() => setIsManagingAccess(true)}
                className="inline-flex items-center gap-2 rounded-md border border-[#611232] bg-white px-3 py-2 text-xs font-semibold text-[#611232] shadow-lg transition hover:bg-rose-50"
              >
                <LockKeyhole className="h-3.5 w-3.5" />
                Accesos al formulario
              </button>
            )}
          </div>
        )}
        {isSuperUser && isManagingAccess && (
          <FormAccessAdmin
            username={credentialsRef.current?.username ?? username}
            password={credentialsRef.current?.password ?? ''}
            onClose={() => setIsManagingAccess(false)}
          />
        )}
      </div>
    );
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-6 text-slate-900 sm:px-6 sm:py-8">
      <header className="mb-6 flex items-center justify-between gap-3 border-b border-slate-900/15 pb-4">
        <h2 className="text-xl font-semibold sm:text-2xl">Validación de datos</h2>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-2 rounded-lg border border-emerald-800/30 bg-emerald-800 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver
        </button>
      </header>

      <form
        onSubmit={handleSubmit}
        className="mx-auto w-full max-w-md space-y-4 rounded-xl border border-[#A57F2C]/35 bg-[#002F2A]/85 p-5 text-white shadow-lg backdrop-blur-sm sm:p-6"
      >
        <div className="flex items-center gap-3 border-b border-white/15 pb-4">
          <LockKeyhole aria-hidden="true" className="h-5 w-5 text-[#A57F2C]" />
          <h3 className="text-base font-semibold">Acceso a validación</h3>
        </div>
        <label className="block space-y-1.5 text-xs font-medium text-white">
          Usuario
          <input
            type="text"
            autoComplete="username"
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="w-full rounded-lg border border-white/20 bg-[#041a17] px-3 py-2.5 text-sm text-white outline-none focus:border-[#A57F2C]"
          />
        </label>
        <label className="block space-y-1.5 text-xs font-medium text-white">
          Contraseña
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-white/20 bg-[#041a17] px-3 py-2.5 text-sm text-white outline-none focus:border-[#A57F2C]"
          />
        </label>
        {error && <p role="alert" className="text-sm text-rose-200">{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-[#006b5b] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#005247] disabled:opacity-60"
        >
          {isSubmitting ? 'Validando...' : 'Ingresar'}
        </button>
      </form>
    </section>
  );
}