import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Copy, KeyRound, Plus, RefreshCw, ShieldOff, ShieldCheck } from 'lucide-react';
import { supabaseClient } from '../../services/supabaseClient';

interface FormAccessAdminProps {
  username: string;
  password: string;
  onClose: () => void;
}

interface AccessRecord {
  id: string;
  titularId: string;
  nombre: string;
  correo: string;
  clave: string;
  anio: string;
  activo: boolean;
  tienePassword: boolean;
  estadoFormulario: string;
  folio: string;
  entryId: string | null;
  enteredAt: string | null;
}

interface InitialCredential {
  nombre: string;
  correo: string;
  clave: string;
  anio: string;
  password: string;
}

const programKeys = ['S313', 'E001', 'U013', 'S200', 'U313', 'E003', 'E004', 'E006'];
const initialRoster = [
  { nombre: 'Reyes Pérez Bernal', correo: 'reyes.perez@imssbienestar.gob.mx', claves: ['U013'] },
  { nombre: 'Víctor Hugo López Aranda', correo: 'victor.lopeza@imssbienestar.gob.mx', claves: ['U013'] },
  { nombre: 'Mtro. Iker Virgilio Lobato González', correo: 'iker.lobato@imssbienestar.gob.mx', claves: ['S313', 'U313', 'S200'] },
  { nombre: 'Guillermo José Argueta Monterrosa', correo: 'guillermo.argueta@imssbienestar.gob.mx', claves: ['S313', 'U313'] },
];

export function FormAccessAdmin({ username, password, onClose }: FormAccessAdminProps) {
  const [accesses, setAccesses] = useState<AccessRecord[]>([]);
  const [initialCredentials, setInitialCredentials] = useState<InitialCredential[]>([]);
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState(programKeys[0]);
  const [anio, setAnio] = useState('2024');
  const [issuedPassword, setIssuedPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [initialProgress, setInitialProgress] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCreateInitialAccesses = async () => {
    if (!supabaseClient) return;
    setIsSaving(true);
    setError('');
    setInitialCredentials([]);
    const assignments = initialRoster.flatMap((titular) =>
      titular.claves.flatMap((key) => ['2024', '2025'].map((year) => ({
        nombre: titular.nombre,
        correo: titular.correo,
        clave: key,
        anio: year,
      }))),
    );
    const created: InitialCredential[] = [];
    let failureMessage = '';

    for (const [index, assignment] of assignments.entries()) {
      setInitialProgress(`Generando ${index + 1} de ${assignments.length}…`);
      const { data, error: rpcError } = await supabaseClient.rpc('guardar_acceso_captura', {
        p_usuario: username,
        p_admin_password: password,
        p_nombre: assignment.nombre,
        p_correo: assignment.correo,
        p_clave: assignment.clave,
        p_anio: assignment.anio,
      });
      if (rpcError || !data?.success) {
        failureMessage = data?.error || `No se pudo crear ${assignment.nombre}, ${assignment.clave}/${assignment.anio}.`;
        break;
      }

      created.push({ ...assignment, password: data.password });
      setInitialCredentials([...created]);
      setCopied(false);
    }

    await loadAccesses();
    if (failureMessage) setError(failureMessage);
    setInitialProgress('');
    setIsSaving(false);
  };

  const loadAccesses = async () => {
    if (!supabaseClient) return;
    setIsLoading(true);
    const { data, error: rpcError } = await supabaseClient.rpc('listar_accesos_captura', {
      p_usuario: username,
      p_password: password,
    });
    if (rpcError || !data?.success) {
      setError(data?.error || 'No fue posible cargar las asignaciones.');
      setIsLoading(false);
      return;
    }
    setAccesses((data.accesses ?? []) as AccessRecord[]);
    setError('');
    setIsLoading(false);
  };

  useEffect(() => {
    void loadAccesses();
  }, []);

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabaseClient) return;
    setIsSaving(true);
    setError('');
    setIssuedPassword('');
    setCopied(false);

    const { data, error: rpcError } = await supabaseClient.rpc('guardar_acceso_captura', {
      p_usuario: username,
      p_admin_password: password,
      p_nombre: nombre,
      p_correo: correo,
      p_clave: clave,
      p_anio: anio,
    });

    if (rpcError || !data?.success) {
      setError(data?.error || 'No fue posible guardar la asignación.');
    } else {
      setIssuedPassword(data.password);
      await loadAccesses();
    }
    setIsSaving(false);
  };

  const handleActiveChange = async (access: AccessRecord) => {
    if (!supabaseClient) return;
    const { data, error: rpcError } = await supabaseClient.rpc('cambiar_estado_acceso_captura', {
      p_usuario: username,
      p_admin_password: password,
      p_access_id: access.id,
      p_activo: !access.activo,
    });
    if (rpcError || !data?.success) {
      setError(data?.error || 'No fue posible cambiar el estado del acceso.');
      return;
    }
    await loadAccesses();
  };

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(issuedPassword);
      setCopied(true);
    } catch {
      setError('No se pudo copiar. Selecciona y copia la contraseña mostrada.');
    }
  };

  const handleCopyInitialCredentials = async () => {
    const text = initialCredentials
      .map(({ nombre: titular, correo: email, clave: key, anio: year, password: code }) => `${titular}\t${email}\t${key}\t${year}\t${code}`)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setError('No se pudo copiar. Selecciona y copia la lista mostrada.');
    }
  };

  return (
    <section className="fixed inset-0 z-[120] overflow-y-auto bg-[#f5f3eb] text-slate-900">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-900/15 bg-[#f5f3eb]/95 px-4 py-3 backdrop-blur sm:px-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#611232]">Reporte · Administración</p>
          <h2 className="text-lg font-semibold">Accesos al formulario</h2>
        </div>
        <button type="button" onClick={onClose} className="inline-flex items-center gap-2 rounded-md border border-slate-900/20 px-3 py-2 text-sm font-medium hover:bg-white">
          <ArrowLeft className="h-4 w-4" />
          Volver al reporte
        </button>
      </header>

      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-6 sm:px-7 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <section className="space-y-4">
          <div>
            <h3 className="text-base font-semibold">Asignar clave y año</h3>
            <p className="mt-1 text-sm text-slate-600">Cada asignación genera una contraseña distinta, vinculada a un titular, una clave y un año.</p>
          </div>
          <form onSubmit={handleSave} className="space-y-3 rounded-lg border border-slate-900/15 bg-white p-4 shadow-sm">
            <label className="block space-y-1 text-sm font-medium">
              <span>Titular</span>
              <input required maxLength={300} value={nombre} onChange={(event) => setNombre(event.target.value)} className="w-full rounded-md border border-slate-900/20 px-3 py-2 outline-none focus:border-[#611232] focus:ring-2 focus:ring-[#611232]/15" />
            </label>
            <label className="block space-y-1 text-sm font-medium">
              <span>Correo</span>
              <input type="email" required maxLength={320} value={correo} onChange={(event) => setCorreo(event.target.value)} className="w-full rounded-md border border-slate-900/20 px-3 py-2 outline-none focus:border-[#611232] focus:ring-2 focus:ring-[#611232]/15" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1 text-sm font-medium">
                <span>Clave</span>
                <select value={clave} onChange={(event) => setClave(event.target.value)} className="w-full rounded-md border border-slate-900/20 bg-white px-3 py-2 outline-none focus:border-[#611232]">
                  {programKeys.map((key) => <option key={key} value={key}>{key}</option>)}
                </select>
              </label>
              <label className="block space-y-1 text-sm font-medium">
                <span>Año</span>
                <input type="number" min="2000" max="2100" step="1" required value={anio} onChange={(event) => setAnio(event.target.value)} className="w-full rounded-md border border-slate-900/20 px-3 py-2 outline-none focus:border-[#611232]" />
              </label>
            </div>
            <button type="submit" disabled={isSaving} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#611232] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4d0e27] disabled:opacity-60">
              {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {isSaving ? 'Generando…' : 'Crear o restablecer contraseña'}
            </button>
          </form>

          {issuedPassword && (
            <div className="rounded-lg border border-emerald-800/25 bg-emerald-50 p-4" role="status">
              <p className="text-sm font-semibold text-emerald-950">Contraseña nueva · {clave}/{anio}</p>
              <p className="mt-1 text-xs text-emerald-900">Cópiala y entrégala al titular ahora. No se puede volver a consultar; para recuperarla, genera una nueva.</p>
              <div className="mt-3 flex items-center gap-2">
                <code className="min-w-0 flex-1 select-all break-all rounded-md border border-emerald-900/20 bg-white px-3 py-2 font-mono text-sm">{issuedPassword}</code>
                <button type="button" onClick={() => void handleCopyPassword()} title="Copiar contraseña" aria-label="Copiar contraseña" className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-emerald-900/20 bg-white hover:bg-emerald-100">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {error && <p role="alert" className="text-sm text-rose-800">{error}</p>}
        </section>

        <section className="min-w-0">
          {initialCredentials.length > 0 && (
            <div className="mb-5 rounded-lg border border-amber-800/25 bg-amber-50 p-4" role="status">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-amber-950">Contraseñas iniciales · mostrar ahora</h3>
                  <p className="mt-1 text-xs text-amber-900">Esta lista solo aparece después de la creación inicial. Entrégale a cada titular solo sus claves/años. Si se pierde, restablece esa asignación.</p>
                </div>
                <button type="button" onClick={() => void handleCopyInitialCredentials()} className="inline-flex items-center gap-1.5 rounded-md border border-amber-900/25 bg-white px-2.5 py-1.5 text-xs font-semibold hover:bg-amber-100">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copiado' : 'Copiar lista'}
                </button>
              </div>
              <div className="mt-3 max-h-72 space-y-2 overflow-auto">
                {initialCredentials.map((credential) => (
                  <div key={`${credential.correo}-${credential.clave}-${credential.anio}`} className="grid gap-1 rounded-md border border-amber-900/10 bg-white p-2.5 text-xs sm:grid-cols-[minmax(0,1fr)_auto]">
                    <div>
                      <p className="font-medium">{credential.nombre} · {credential.clave}/{credential.anio}</p>
                      <p className="text-slate-500">{credential.correo}</p>
                    </div>
                    <code className="select-all break-all font-mono">{credential.password}</code>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold">Asignaciones registradas</h3>
              <p className="text-sm text-slate-600">Las contraseñas guardadas se almacenan como hash y no son visibles.</p>
            </div>
            <button type="button" onClick={() => void loadAccesses()} disabled={isLoading} title="Actualizar asignaciones" aria-label="Actualizar asignaciones" className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-slate-900/20 bg-white hover:bg-slate-50 disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          {isLoading ? (
            <p role="status" className="py-10 text-center text-sm text-slate-500">Cargando asignaciones…</p>
          ) : accesses.length === 0 ? (
            <div className="space-y-3 rounded-lg border border-slate-900/15 bg-white px-4 py-7 text-center">
              <p className="text-sm text-slate-600">Todavía no hay asignaciones.</p>
              <button type="button" onClick={() => void handleCreateInitialAccesses()} disabled={isSaving} className="inline-flex items-center gap-2 rounded-md bg-[#611232] px-3 py-2 text-sm font-semibold text-white hover:bg-[#4d0e27] disabled:opacity-60">
                {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  {isSaving ? initialProgress || 'Preparando…' : 'Crear las 14 asignaciones iniciales'}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-900/15 bg-white">
              <table className="w-full min-w-[740px] border-collapse text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">Titular / correo</th>
                    <th className="px-3 py-2.5 font-semibold">Clave / año</th>
                    <th className="px-3 py-2.5 font-semibold">Cuestionario</th>
                    <th className="px-3 py-2.5 font-semibold">Última entrada</th>
                    <th className="px-3 py-2.5 font-semibold">Acceso</th>
                  </tr>
                </thead>
                <tbody>
                  {accesses.map((access) => (
                    <tr key={access.id} className="border-t border-slate-900/10 align-top">
                      <td className="px-3 py-3">
                        <p className="font-medium">{access.nombre}</p>
                        <p className="break-all text-xs text-slate-500">{access.correo}</p>
                      </td>
                      <td className="px-3 py-3 font-medium">{access.clave} / {access.anio}</td>
                      <td className="px-3 py-3">
                        <p>{access.estadoFormulario === 'CONCLUIDO' ? 'Concluido' : access.estadoFormulario === 'EN_CAPTURA' ? 'En captura' : 'Sin iniciar'}</p>
                        {access.folio && <p className="text-xs text-slate-500">{access.folio}</p>}
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-mono text-xs">{access.entryId || 'Sin entradas'}</p>
                        {access.enteredAt && <p className="mt-1 text-xs text-slate-500">{new Date(access.enteredAt).toLocaleString('es-MX')}</p>}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => { setNombre(access.nombre); setCorreo(access.correo); setClave(access.clave); setAnio(access.anio); setIssuedPassword(''); }} className="inline-flex items-center gap-1 rounded border border-slate-900/20 px-2 py-1 text-xs font-medium hover:bg-slate-50">
                            <KeyRound className="h-3.5 w-3.5" />
                            Restablecer
                          </button>
                          <button type="button" onClick={() => void handleActiveChange(access)} className="inline-flex items-center gap-1 rounded border border-slate-900/20 px-2 py-1 text-xs font-medium hover:bg-slate-50">
                            {access.activo ? <ShieldOff className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                            {access.activo ? 'Revocar' : 'Activar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
