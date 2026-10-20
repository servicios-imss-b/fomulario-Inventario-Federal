import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Copy, KeyRound, Plus, RefreshCw, ShieldOff, ShieldCheck } from 'lucide-react';
import { supabaseClient } from '../../services/supabaseClient';

interface FormAccessAdminProps {
  username: string;
  password: string;
  onClose: () => void;
}

interface AssignmentRecord {
  id: string;
  clave: string;
  anio: string;
  activo: boolean;
  estadoFormulario: string;
  folio: string;
}

interface AccessRecord {
  titularId: string;
  nombre: string;
  correo: string;
  activo: boolean;
  password: string | null;
  assignments: AssignmentRecord[];
}

interface InitialCredential {
  nombre: string;
  correo: string;
  assignments: Array<{ clave: string; anio: string }>;
  password: string;
}

const programKeys = ['S313', 'E001', 'U013', 'S200', 'U313', 'E003', 'E004', 'E006'];
const assignmentYears = ['2024', '2025', '2026', '2027'];
const assignmentOptions = programKeys.flatMap((clave) => assignmentYears.map((anio) => ({
  id: `${clave}::${anio}`,
  clave,
  anio,
})));
const initialRoster = [
  { nombre: 'Reyes Pérez Bernal', correo: 'reyes.perez@imssbienestar.gob.mx', claves: ['U013'] },
  { nombre: 'Víctor Hugo López Aranda', correo: 'victor.lopeza@imssbienestar.gob.mx', claves: ['U013'] },
  { nombre: 'Mtro. Iker Virgilio Lobato González', correo: 'iker.lobato@imssbienestar.gob.mx', claves: ['S313', 'U313', 'S200'] },
  { nombre: 'Guillermo José Argueta Monterrosa', correo: 'guillermo.argueta@imssbienestar.gob.mx', claves: ['S313', 'U313'] },
];

function normalizeAccesses(rows: unknown): AccessRecord[] {
  if (!Array.isArray(rows)) return [];
  if (rows.every((row) => row && typeof row === 'object' && Array.isArray((row as Record<string, unknown>).assignments))) {
    return rows as AccessRecord[];
  }

  const grouped = new Map<string, AccessRecord>();
  for (const value of rows) {
    if (!value || typeof value !== 'object') continue;
    const row = value as Record<string, unknown>;
    const titularId = typeof row.titularId === 'string' ? row.titularId : '';
    if (!titularId || typeof row.clave !== 'string' || typeof row.anio !== 'string') continue;
    const access = grouped.get(titularId) ?? {
      titularId,
      nombre: typeof row.nombre === 'string' ? row.nombre : '',
      correo: typeof row.correo === 'string' ? row.correo : '',
      activo: true,
      password: null,
      assignments: [],
    };
    access.assignments.push({
      id: typeof row.id === 'string' ? row.id : `${row.clave}::${row.anio}`,
      clave: row.clave,
      anio: row.anio,
      activo: Boolean(row.activo),
      estadoFormulario: typeof row.estadoFormulario === 'string' ? row.estadoFormulario : 'SIN_INICIAR',
      folio: typeof row.folio === 'string' ? row.folio : '',
    });
    grouped.set(titularId, access);
  }
  return [...grouped.values()].sort((left, right) => left.nombre.localeCompare(right.nombre, 'es'));
}

export function FormAccessAdmin({ username, password, onClose }: FormAccessAdminProps) {
  const [accesses, setAccesses] = useState<AccessRecord[]>([]);
  const [initialCredentials, setInitialCredentials] = useState<InitialCredential[]>([]);
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [selectedAssignments, setSelectedAssignments] = useState<string[]>([]);
  const [issuedPassword, setIssuedPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [initialProgress, setInitialProgress] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedAccessId, setCopiedAccessId] = useState('');

  const handleCreateInitialAccesses = async () => {
    if (!supabaseClient) return;
    setIsSaving(true);
    setError('');
    setInitialCredentials([]);
    const assignments = initialRoster.map((titular) => ({
      nombre: titular.nombre,
      correo: titular.correo,
      assignments: titular.claves.flatMap((clave) => ['2024', '2025'].map((anio) => ({ clave, anio }))),
    }));
    setInitialProgress(`Generando ${assignments.length} contraseñas…`);
    const results = await Promise.all(assignments.map(async (assignment) => {
      const { data, error: rpcError } = await supabaseClient.rpc('guardar_accesos_titular', {
        p_usuario: username,
        p_admin_password: password,
        p_nombre: assignment.nombre,
        p_correo: assignment.correo,
        p_assignments: assignment.assignments,
      });
      if (rpcError || !data?.success) {
        return { error: data?.error || `No se pudo crear el acceso de ${assignment.nombre}.` };
      }
      return { credential: { ...assignment, password: data.password } };
    }));
    const created = results.flatMap((result) => result.credential ? [result.credential] : []);
    const failureMessage = results.flatMap((result) => result.error ? [result.error] : []).join(' ');
    setInitialCredentials(created);
    setCopied(false);

    await loadAccesses();
    if (failureMessage) setError(failureMessage);
    setInitialProgress('');
    setIsSaving(false);
  };

  const handleCreateTitularPasswords = async () => {
    if (!supabaseClient) return;
    setIsSaving(true);
    setError('');
    setInitialCredentials([]);
    const holders = accesses
      .map((access) => ({
        nombre: access.nombre,
        correo: access.correo,
        assignments: access.assignments
          .filter((assignment) => assignment.activo)
          .map(({ clave: key, anio: year }) => ({ clave: key, anio: year })),
      }))
      .filter((access) => access.assignments.length > 0);
    const results: { credential?: InitialCredential; error?: string }[] = [];
    for (let start = 0; start < holders.length; start += 4) {
      const batch = holders.slice(start, start + 4);
      setInitialProgress(`Generando ${Math.min(start + batch.length, holders.length)} de ${holders.length}…`);
      results.push(...await Promise.all(batch.map(async (holder) => {
        const { data, error: rpcError } = await supabaseClient.rpc('guardar_accesos_titular', {
          p_usuario: username,
          p_admin_password: password,
          p_nombre: holder.nombre,
          p_correo: holder.correo,
          p_assignments: holder.assignments,
        });
        if (rpcError || !data?.success) {
          return { error: data?.error || `No se pudo regenerar la contraseña de ${holder.nombre}.` };
        }
        return { credential: { ...holder, password: data.password } };
      })));
    }
    const created = results.flatMap((result) => result.credential ? [result.credential] : []);
    const failureMessage = results.flatMap((result) => result.error ? [result.error] : []).join(' ');
    setInitialCredentials(created);
    setCopied(false);

    await loadAccesses();
    if (failureMessage) setError(failureMessage);
    setInitialProgress('');
    setIsSaving(false);
  };

  const toggleAssignment = (assignmentId: string) => {
    setSelectedAssignments((current) => current.includes(assignmentId)
      ? current.filter((id) => id !== assignmentId)
      : [...current, assignmentId]);
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
    setAccesses(normalizeAccesses(data.accesses));
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

    const assignments = assignmentOptions
      .filter((assignment) => selectedAssignments.includes(assignment.id))
      .map(({ clave: assignmentKey, anio: assignmentYear }) => ({ clave: assignmentKey, anio: assignmentYear }));
    if (assignments.length === 0) {
      setError('Selecciona al menos una clave y un año.');
      setIsSaving(false);
      return;
    }

    const { data, error: rpcError } = await supabaseClient.rpc('guardar_accesos_titular', {
      p_usuario: username,
      p_admin_password: password,
      p_nombre: nombre,
      p_correo: correo,
      p_assignments: assignments,
    });

    if (rpcError || !data?.success) {
      setError(data?.error || 'No fue posible guardar la asignación.');
    } else {
      setIssuedPassword(data.password);
      await loadAccesses();
    }
    setIsSaving(false);
  };

  const handleActiveChange = async (assignment: AssignmentRecord) => {
    if (!supabaseClient) return;
    const { data, error: rpcError } = await supabaseClient.rpc('cambiar_estado_acceso_captura', {
      p_usuario: username,
      p_admin_password: password,
      p_access_id: assignment.id,
      p_activo: !assignment.activo,
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
      .map(({ nombre: titular, correo: email, assignments: allowed, password: code }) => `${titular}\t${email}\t${allowed.map(({ clave: key, anio: year }) => `${key}/${year}`).join(', ')}\t${code}`)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setError('No se pudo copiar. Selecciona y copia la lista mostrada.');
    }
  };

  const handleCopyAccessPassword = async (access: AccessRecord) => {
    if (!access.password) return;
    try {
      await navigator.clipboard.writeText(access.password);
      setCopiedAccessId(access.titularId);
    } catch {
      setError('No se pudo copiar. Selecciona y copia la contraseña mostrada.');
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
            <p className="mt-1 text-sm text-slate-600">Cada titular tiene una contraseña para todas las claves y años seleccionados.</p>
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
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Claves y años autorizados</legend>
              <div className="grid grid-cols-2 gap-2">
                {assignmentOptions.map((assignment) => (
                  <label key={assignment.id} className="flex items-center gap-2 rounded-md border border-slate-900/10 px-2.5 py-2 text-sm hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={selectedAssignments.includes(assignment.id)}
                      onChange={() => toggleAssignment(assignment.id)}
                      className="h-4 w-4 accent-[#611232]"
                    />
                    {assignment.clave} / {assignment.anio}
                  </label>
                ))}
              </div>
            </fieldset>
            <button type="submit" disabled={isSaving} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#611232] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4d0e27] disabled:opacity-60">
              {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {isSaving ? 'Generando…' : 'Crear o restablecer contraseña'}
            </button>
          </form>

          {issuedPassword && (
            <div className="rounded-lg border border-emerald-800/25 bg-emerald-50 p-4" role="status">
              <p className="text-sm font-semibold text-emerald-950">Contraseña única de {nombre}</p>
              <p className="mt-1 text-xs text-emerald-900">Cópiala y entrégala al titular. Autoriza las combinaciones seleccionadas y se puede volver a consultar aquí.</p>
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
                  <div key={credential.correo} className="grid gap-1 rounded-md border border-amber-900/10 bg-white p-2.5 text-xs sm:grid-cols-[minmax(0,1fr)_auto]">
                    <div>
                      <p className="font-medium">{credential.nombre}</p>
                      <p className="text-slate-500">{credential.correo}</p>
                      <p className="mt-1 text-slate-600">{credential.assignments.map(({ clave: key, anio: year }) => `${key}/${year}`).join(', ')}</p>
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
              <p className="text-sm text-slate-600">Las contraseñas se validan con bcrypt y se guardan cifradas en Supabase; solo add.31 puede consultarlas desde aquí.</p>
            </div>
            <button type="button" onClick={() => void loadAccesses()} disabled={isLoading} title="Actualizar asignaciones" aria-label="Actualizar asignaciones" className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-slate-900/20 bg-white hover:bg-slate-50 disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          {isLoading ? (
            <p role="status" className="py-10 text-center text-sm text-slate-500">Cargando asignaciones…</p>
          ) : accesses.some((access) => !access.password) ? (
            <div className="space-y-3 rounded-lg border border-slate-900/15 bg-white px-4 py-7 text-center">
              <p className="text-sm text-slate-600">Hay titulares con contraseñas antiguas por combinación. Genera una sola contraseña por persona para sus permisos activos.</p>
              <button type="button" onClick={() => void handleCreateTitularPasswords()} disabled={isSaving} className="inline-flex items-center gap-2 rounded-md bg-[#611232] px-3 py-2 text-sm font-semibold text-white hover:bg-[#4d0e27] disabled:opacity-60">
                {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                {isSaving ? initialProgress || 'Preparando…' : 'Generar una contraseña por titular'}
              </button>
            </div>
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
              <table className="w-full min-w-[820px] border-collapse text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">Titular / correo</th>
                    <th className="px-3 py-2.5 font-semibold">Permisos asignados</th>
                    <th className="px-3 py-2.5 font-semibold">Contraseña</th>
                    <th className="px-3 py-2.5 font-semibold">Acceso</th>
                  </tr>
                </thead>
                <tbody>
                  {accesses.map((access) => (
                    <tr key={access.titularId} className="border-t border-slate-900/10 align-top">
                      <td className="px-3 py-3">
                        <p className="font-medium">{access.nombre}</p>
                        <p className="break-all text-xs text-slate-500">{access.correo}</p>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {access.assignments.map((assignment) => (
                            <span key={assignment.id} className="inline-flex items-center gap-1.5 rounded border border-slate-900/10 bg-slate-50 px-2 py-1 text-xs">
                              {assignment.clave}/{assignment.anio}
                              <button
                                type="button"
                                onClick={() => void handleActiveChange(assignment)}
                                aria-label={`${assignment.activo ? 'Revocar' : 'Activar'} ${assignment.clave}/${assignment.anio} para ${access.nombre}`}
                                title={assignment.activo ? 'Revocar combinación' : 'Activar combinación'}
                                className="grid h-5 w-5 place-items-center rounded hover:bg-white"
                              >
                                {assignment.activo ? <ShieldOff className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
                              </button>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {access.password ? (
                          <div className="flex max-w-[260px] items-center gap-2">
                            <code className="min-w-0 flex-1 select-all break-all font-mono text-xs">{access.password}</code>
                            <button
                              type="button"
                              onClick={() => void handleCopyAccessPassword(access)}
                              title="Copiar contraseña"
                              aria-label={`Copiar contraseña de ${access.nombre}`}
                              className="grid h-8 w-8 shrink-0 place-items-center rounded border border-slate-900/15 hover:bg-slate-50"
                            >
                              {copiedAccessId === access.titularId ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">Sin contraseña cifrada</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => {
                            setNombre(access.nombre);
                            setCorreo(access.correo);
                            setSelectedAssignments(access.assignments.filter((assignment) => assignment.activo).map((assignment) => `${assignment.clave}::${assignment.anio}`));
                            setIssuedPassword('');
                          }}
                          className="inline-flex items-center gap-1 rounded border border-slate-900/20 px-2 py-1 text-xs font-medium hover:bg-slate-50"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                          Restablecer contraseña
                        </button>
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
