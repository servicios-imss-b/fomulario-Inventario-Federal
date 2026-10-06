import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { ArrowLeft, LogOut, RefreshCw, ShieldCheck } from 'lucide-react';
import { supabaseClient } from '../../services/supabaseClient';
import { TableFront } from './TableFront';
import type { TableColumn, TableRow } from './types';

interface AdminDataViewProps {
  onClose: () => void;
}

interface FormRecord {
  id: string;
  folio: string;
  usuario_nombre: string | null;
  usuario_correo: string | null;
  usuario_entidad: string | null;
  fecha_creacion: string;
  estado: string;
}

interface ResponseRecord {
  formulario_id: string;
  pregunta_id: string;
  pregunta: string;
  respuesta: unknown;
  fuente: string | null;
}

const columns: TableColumn[] = [
  { key: 'folio', label: 'Folio' },
  { key: 'programa', label: 'Programa' },
  { key: 'anio', label: 'Año' },
  { key: 'responsable', label: 'Responsable' },
  { key: 'entidad', label: 'Entidad' },
  { key: 'fecha', label: 'Fecha' },
  { key: 'estado', label: 'Estado' },
];

const asText = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
};

export function AdminDataView({ onClose }: AdminDataViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isLoadingForms, setIsLoadingForms] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [forms, setForms] = useState<FormRecord[]>([]);
  const [rows, setRows] = useState<TableRow[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [selectedResponses, setSelectedResponses] = useState<ResponseRecord[]>([]);
  const [isLoadingResponses, setIsLoadingResponses] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      if (!supabaseClient) {
        setIsCheckingSession(false);
        return;
      }

      const { data, error } = await supabaseClient.auth.getSession();
      if (!isMounted) return;
      if (error) setErrorMessage(error.message);
      const user = data.session?.user ?? null;
      if (user?.app_metadata?.role === 'admin') {
        setAdminUser(user);
      } else if (user) {
        await supabaseClient.auth.signOut();
        setErrorMessage('Esta cuenta no tiene permiso para consultar los registros.');
      }
      setIsCheckingSession(false);
    };

    void checkSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const loadForms = async () => {
    if (!supabaseClient) return;
    setIsLoadingForms(true);
    setErrorMessage('');

    const { data, error } = await supabaseClient
      .from('formularios')
      .select('id, folio, usuario_nombre, usuario_correo, usuario_entidad, fecha_creacion, estado')
      .order('fecha_creacion', { ascending: false })
      .limit(1000);

    if (error) {
      setErrorMessage(error.message);
      setIsLoadingForms(false);
      return;
    }

    const records = (data ?? []) as FormRecord[];
    setForms(records);
    setSelectedFormId(null);
    setSelectedResponses([]);

    if (records.length === 0) {
      setRows([]);
      setIsLoadingForms(false);
      return;
    }

    const { data: answers, error: answerError } = await supabaseClient
      .from('respuestas')
      .select('formulario_id, pregunta_id, respuesta')
      .in('formulario_id', records.map((form) => form.id))
      .in('pregunta_id', ['clave_programa', 'anio_captura']);

    if (answerError) {
      setErrorMessage(answerError.message);
      setIsLoadingForms(false);
      return;
    }

    const programData = new Map<string, { programa: string; anio: string }>();
    for (const answer of answers ?? []) {
      const current = programData.get(answer.formulario_id) ?? { programa: '', anio: '' };
      if (answer.pregunta_id === 'clave_programa') current.programa = asText(answer.respuesta);
      if (answer.pregunta_id === 'anio_captura') current.anio = asText(answer.respuesta);
      programData.set(answer.formulario_id, current);
    }

    setRows(records.map((form) => {
      const program = programData.get(form.id);
      return {
        id: form.id,
        folio: form.folio,
        programa: program?.programa ?? '',
        anio: program?.anio ?? '',
        responsable: form.usuario_nombre ?? '',
        entidad: form.usuario_entidad ?? '',
        fecha: form.fecha_creacion ? new Date(form.fecha_creacion).toLocaleDateString('es-MX') : '',
        estado: form.estado,
      };
    }));
    setIsLoadingForms(false);
  };

  useEffect(() => {
    if (adminUser) void loadForms();
  }, [adminUser]);

  useEffect(() => {
    if (!supabaseClient || !selectedFormId) return;
    let isMounted = true;
    setIsLoadingResponses(true);

    void supabaseClient
      .from('respuestas')
      .select('formulario_id, pregunta_id, pregunta, respuesta, fuente')
      .eq('formulario_id', selectedFormId)
      .order('pregunta_id', { ascending: true })
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) {
          setErrorMessage(error.message);
          setSelectedResponses([]);
        } else {
          setSelectedResponses((data ?? []) as ResponseRecord[]);
        }
        setIsLoadingResponses(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedFormId]);

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabaseClient) return;

    setIsSigningIn(true);
    setErrorMessage('');
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
      setErrorMessage(error.message);
    } else if (data.user.app_metadata?.role !== 'admin') {
      await supabaseClient.auth.signOut();
      setErrorMessage('La cuenta inició sesión, pero no tiene el rol de administrador.');
    } else {
      setAdminUser(data.user);
      setPassword('');
    }
    setIsSigningIn(false);
  };

  const handleSignOut = async () => {
    await supabaseClient?.auth.signOut();
    setAdminUser(null);
    setRows([]);
    setForms([]);
    setSelectedFormId(null);
    setSelectedResponses([]);
  };

  const selectedForm = forms.find((form) => form.id === selectedFormId);

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-6 text-stone-100 sm:px-6 sm:py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#A57F2C]/30 pb-4">
        <div>
          <h2 className="text-xl font-semibold sm:text-2xl">Visualización de datos</h2>
          {adminUser && <p className="mt-1 text-xs text-stone-400">Sesión: {adminUser.email}</p>}
        </div>
        <div className="flex items-center gap-2">
          {adminUser && (
            <>
              <button
                type="button"
                onClick={() => void loadForms()}
                disabled={isLoadingForms}
                className="inline-flex items-center gap-2 rounded-lg border border-[#A57F2C]/40 px-3 py-2 text-xs font-semibold text-[#f4ead0] transition hover:bg-white/10 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoadingForms ? 'animate-spin' : ''}`} />
                Actualizar
              </button>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-stone-200 transition hover:bg-white/10"
              >
                <LogOut className="h-3.5 w-3.5" />
                Cerrar sesión
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-stone-200 transition hover:bg-white/10"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver
          </button>
        </div>
      </header>

      {!supabaseClient ? (
        <div className="rounded-xl border border-amber-400/30 bg-amber-950/30 p-5 text-sm text-amber-100">
          Configura `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` para consultar registros desde Pages.
        </div>
      ) : isCheckingSession ? (
        <p className="py-12 text-center text-sm text-stone-300">Verificando sesión...</p>
      ) : !adminUser ? (
        <form onSubmit={handleSignIn} className="mx-auto w-full max-w-md space-y-4 rounded-xl border border-[#A57F2C]/30 bg-[#002F2A]/70 p-5 sm:p-6">
          <div className="flex items-center gap-3 border-b border-[#A57F2C]/20 pb-4">
            <ShieldCheck aria-hidden="true" className="h-5 w-5 text-[#A57F2C]" />
            <h3 className="text-base font-semibold">Acceso administrativo</h3>
          </div>
          <label className="block space-y-1.5 text-xs font-medium text-stone-300">
            Correo
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-white/15 bg-black/25 px-3 py-2.5 text-sm text-white outline-none focus:border-[#A57F2C]"
            />
          </label>
          <label className="block space-y-1.5 text-xs font-medium text-stone-300">
            Contraseña
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-white/15 bg-black/25 px-3 py-2.5 text-sm text-white outline-none focus:border-[#A57F2C]"
            />
          </label>
          {errorMessage && <p role="alert" className="text-sm text-rose-300">{errorMessage}</p>}
          <button
            type="submit"
            disabled={isSigningIn}
            className="w-full rounded-lg bg-[#A57F2C] px-4 py-2.5 text-sm font-semibold text-[#002F2A] transition hover:bg-[#c4993a] disabled:opacity-60"
          >
            {isSigningIn ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      ) : (
        <>
          {errorMessage && <p role="alert" className="mb-4 text-sm text-rose-300">{errorMessage}</p>}
          <TableFront
            columns={columns}
            rows={rows}
            selectedRowId={selectedFormId}
            onSelectRow={setSelectedFormId}
          />
          {isLoadingForms && <p className="mt-3 text-xs text-stone-400">Cargando registros...</p>}
          {selectedForm && (
            <section className="mt-6 border-t border-[#A57F2C]/25 pt-5">
              <h3 className="mb-4 text-base font-semibold">Respuestas de {selectedForm.folio}</h3>
              {isLoadingResponses ? (
                <p className="text-sm text-stone-300">Cargando respuestas...</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white text-stone-800">
                  <table className="w-full text-sm">
                    <thead className="bg-stone-50 text-xs uppercase text-stone-500">
                      <tr>
                        <th className="px-4 py-3 text-left">Pregunta</th>
                        <th className="px-4 py-3 text-left">Respuesta</th>
                        <th className="px-4 py-3 text-left">Fuente</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedResponses.map((answer) => (
                        <tr key={`${answer.formulario_id}-${answer.pregunta_id}`} className="border-t border-stone-100 align-top">
                          <td className="min-w-64 px-4 py-3">{answer.pregunta || answer.pregunta_id}</td>
                          <td className="min-w-72 whitespace-pre-wrap px-4 py-3">{asText(answer.respuesta) || '—'}</td>
                          <td className="min-w-40 whitespace-pre-wrap px-4 py-3">{answer.fuente || '—'}</td>
                        </tr>
                      ))}
                      {selectedResponses.length === 0 && (
                        <tr><td colSpan={3} className="px-4 py-10 text-center text-stone-400">Este formulario no tiene respuestas.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </section>
  );
}