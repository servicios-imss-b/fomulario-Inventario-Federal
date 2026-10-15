import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, LockKeyhole } from 'lucide-react';
import { supabaseClient } from '../services/supabaseClient';

interface FrontValidationAccessProps {
  onClose: () => void;
}

const VALIDATION_USER = 'add.31';
const VALIDATION_PASSWORD = '3180';
type ReportRow = Record<string, string | number>;

export function FrontValidationAccess({ onClose }: FrontValidationAccessProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [reportRows, setReportRows] = useState<ReportRow[]>([]);
  const [reportDataMessage, setReportDataMessage] = useState('Cargando respuestas de Supabase...');
  const [error, setError] = useState('');

  useEffect(() => {
    const sendData = () => {
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'supabase-relational-data', rows: reportRows, error: reportDataMessage },
        window.location.origin,
      );
    };

    const handleReportReady = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type === 'reporte-new-ready') sendData();
    };

    window.addEventListener('message', handleReportReady);
    if (isAuthenticated) sendData();
    return () => window.removeEventListener('message', handleReportReady);
  }, [isAuthenticated, reportRows, reportDataMessage]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (username === VALIDATION_USER && password === VALIDATION_PASSWORD) {
      const reportUsername = username;
      const reportPassword = password;
      setPassword('');
      setError('');
      setIsAuthenticated(true);
      if (!supabaseClient) {
        setReportDataMessage('No está configurada la conexión a Supabase.');
        return;
      }
      try {
        const { data, error: invokeError } = await supabaseClient.functions.invoke('reporte-relacional', {
          body: { username: reportUsername, password: reportPassword },
        });
        if (invokeError || !data?.success || !Array.isArray(data.rows)) {
          setReportDataMessage(invokeError?.message || data?.error || 'No fue posible cargar las respuestas desde Supabase.');
        } else {
          setReportRows(data.rows as ReportRow[]);
          setReportDataMessage('');
        }
      } catch {
        setReportDataMessage('No fue posible conectar con la función de Supabase.');
      }
      return;
    }
    setError('Usuario o contraseña incorrectos.');
  };

  if (isAuthenticated) {
    return (
      <iframe
        ref={iframeRef}
        title="Reporte de situación hospitalaria"
        src={`${import.meta.env.BASE_URL}reporte-new/index.html`}
        onLoad={() => iframeRef.current?.contentWindow?.postMessage(
          { type: 'supabase-relational-data', rows: reportRows, error: reportDataMessage },
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
          className="w-full rounded-lg bg-[#006b5b] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#005247]"
        >
          Ingresar
        </button>
      </form>
    </section>
  );
}