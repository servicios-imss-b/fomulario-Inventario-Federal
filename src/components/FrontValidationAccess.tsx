import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, LockKeyhole } from 'lucide-react';
import { supabaseClient } from '../services/supabaseClient';

interface FrontValidationAccessProps {
  onClose: () => void;
}

type ReportRow = Record<string, string | number>;
type ReportResult = { rows: ReportRow[] } | { error: string; authFailed: boolean };

const REFRESH_INTERVAL_MS = 30_000;

async function fetchReport(username: string, password: string): Promise<ReportResult> {
  const serverResponse = await fetch(`${import.meta.env.BASE_URL}api/reporte-relacional`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  }).catch(() => null);
  const serverData = serverResponse?.headers.get('content-type')?.includes('application/json')
    ? await serverResponse.json().catch(() => null)
    : null;
  if (serverData?.success && Array.isArray(serverData.rows)) return { rows: serverData.rows as ReportRow[] };
  if (serverResponse?.status === 401 || serverResponse?.status === 429) {
    return { error: serverData?.error || 'Usuario o contraseña incorrectos.', authFailed: true };
  }

  // Sin servidor (GitHub Pages): la función SQL valida el acceso dentro de Supabase.
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
        setReportRows(result.rows);
        setReportDataMessage('');
        setUpdatedAt(new Date().toISOString());
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

  useEffect(() => {
    if (!isAuthenticated) return;
    const timer = window.setInterval(() => void refreshReport(), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [isAuthenticated, refreshReport]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const result = await fetchReport(username, password);
      if ('rows' in result) {
        credentialsRef.current = { username, password };
        setPassword('');
        setReportRows(result.rows);
        setReportDataMessage('');
        setUpdatedAt(new Date().toISOString());
        setIsAuthenticated(true);
      } else {
        setError(result.error);
      }
    } catch {
      setError('No fue posible conectar con Supabase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthenticated) {
    return (
      <iframe
        ref={iframeRef}
        title="Reporte de situación hospitalaria"
        src={`${import.meta.env.BASE_URL}reporte-new/index.html`}
        onLoad={() => iframeRef.current?.contentWindow?.postMessage(
          { type: 'supabase-relational-data', rows: reportRows, error: reportDataMessage, updatedAt },
          window.location.origin,
        )}
        className="fixed inset-0 z-[100] block h-dvh w-full border-0 bg-gray-50"
      />
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