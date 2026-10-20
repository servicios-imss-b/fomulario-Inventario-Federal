import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, KeyRound } from 'lucide-react';
import { supabaseClient } from '../services/supabaseClient';
import type { RespuestaItem } from '../types/form';

export type FormAccessSession = {
  accessId: string;
  entryId: string;
  password: string;
  titularId: string;
  titularNombre: string;
  titularCorreo: string;
  clave: string;
  anio: string;
  formularioId: string | null;
  folio: string;
  answers: Record<string, RespuestaItem>;
  submittedSections: string[];
};

interface TitularAssignment {
  id: string;
  clave: string;
  anio: string;
  completed: boolean;
  folio: string;
}

interface FormAccessGateProps {
  onSelect: (access: FormAccessSession) => void;
  onCancel: () => void;
}

export function FormAccessGate({ onSelect, onCancel }: FormAccessGateProps) {
  const [password, setPassword] = useState('');
  const [titular, setTitular] = useState<{ id: string; nombre: string; correo: string } | null>(null);
  const [assignments, setAssignments] = useState<TitularAssignment[]>([]);
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const handleStart = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabaseClient) {
      setError('El acceso protegido no está configurado. Contacta a la persona administradora.');
      return;
    }

    setError('');
    setIsBusy(true);
    const { data, error: accessError } = await supabaseClient.rpc('iniciar_captura_formulario', {
      p_password: password,
    });

    if (accessError || !data?.success) {
      setError(accessError ? 'No fue posible verificar la contraseña.' : data?.error || 'Contraseña incorrecta.');
      setPassword('');
      setIsBusy(false);
      return;
    }

    if (!data.titularId || !data.nombre || !Array.isArray(data.assignments) || data.assignments.length === 0) {
      setError('Esta contraseña no tiene asignaciones activas. Contacta a la persona administradora.');
      setIsBusy(false);
      return;
    }

    setTitular({ id: data.titularId, nombre: data.nombre, correo: data.correo });
    setAssignments(data.assignments as TitularAssignment[]);
    setIsBusy(false);
  };

  const handleSelectAssignment = async (assignment: TitularAssignment) => {
    if (!supabaseClient || assignment.completed) return;
    setError('');
    setIsBusy(true);
    const { data, error: accessError } = await supabaseClient.rpc('seleccionar_captura_formulario', {
      p_password: password,
      p_access_id: assignment.id,
    });

    if (accessError || !data?.success) {
      setError(accessError ? 'No fue posible iniciar esta asignación.' : data?.error || 'No fue posible iniciar esta asignación.');
      setIsBusy(false);
      return;
    }

    if (data.completed) {
      setAssignments((current) => current.map((item) => item.id === assignment.id ? { ...item, completed: true, folio: data.folio || '' } : item));
      setError(`El cuestionario ${assignment.clave}/${assignment.anio} ya está concluido${data.folio ? ` (folio ${data.folio})` : ''}.`);
      setIsBusy(false);
      return;
    }

    if (!data.entryId || !data.titularId || !data.formularioId) {
      setError('Supabase no devolvió el ID de entrada de esta asignación.');
      setIsBusy(false);
      return;
    }

    onSelect({
      accessId: assignment.id,
      entryId: data.entryId,
      password,
      titularId: data.titularId,
      titularNombre: data.nombre,
      titularCorreo: data.correo,
      clave: data.clave,
      anio: data.anio,
      formularioId: data.formularioId,
      folio: data.folio ?? '',
      answers: data.answers ?? {},
      submittedSections: Array.isArray(data.submittedSections) ? data.submittedSections : [],
    });
    setIsBusy(false);
  };

  const handleBackToPassword = () => {
    setTitular(null);
    setAssignments([]);
    setPassword('');
    setError('');
  };

  return (
    <section className="mx-auto flex min-h-[60vh] w-full max-w-xl items-center px-4 py-10">
      <div className="w-full rounded-xl border border-[#A57F2C]/35 bg-[#002F2A]/90 p-6 text-white shadow-2xl sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#A57F2C]/50 bg-[#611232]/60 text-[#f0d790]">
            {titular ? <CheckCircle2 className="h-5 w-5" /> : <KeyRound className="h-5 w-5" />}
          </span>
          <div>
            <h2 className="text-lg font-semibold">Acceso al formulario</h2>
            <p className="text-sm text-white/70">Ingresa la contraseña personal y elige una de tus asignaciones.</p>
          </div>
        </div>

        {titular ? (
          <div className="space-y-4">
            <div>
              <p className="font-medium">{titular.nombre}</p>
              <p className="text-xs text-white/65">{titular.correo}</p>
            </div>
            <p className="text-sm font-medium">Elige la clave y el año que vas a llenar:</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {assignments.map((assignment) => (
                <button
                  key={assignment.id}
                  type="button"
                  disabled={isBusy || assignment.completed}
                  onClick={() => void handleSelectAssignment(assignment)}
                  className="flex min-h-14 items-center justify-between rounded-md border border-white/20 bg-white/5 px-4 py-3 text-left text-sm transition hover:border-[#A57F2C] hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A57F2C] disabled:cursor-not-allowed disabled:opacity-65"
                >
                  <span><strong>{assignment.clave}</strong><span className="mx-2 text-white/45">/</span>{assignment.anio}</span>
                  <span className="text-xs text-[#f0d790]">{assignment.completed ? 'Concluido' : 'Entrar'}</span>
                </button>
              ))}
            </div>
            {error && <p role="alert" className="text-sm text-rose-200">{error}</p>}
            <button type="button" onClick={handleBackToPassword} className="inline-flex items-center gap-2 text-sm text-white/70 underline underline-offset-4 hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Otra contraseña
            </button>
          </div>
        ) : (
          <form onSubmit={handleStart} className="space-y-4">
            <label className="block space-y-1.5 text-sm font-medium">
              <span>Contraseña de acceso</span>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoFocus
                className="w-full rounded-md border border-white/25 bg-white px-3 py-2.5 text-slate-950 outline-none focus:border-[#A57F2C] focus:ring-2 focus:ring-[#A57F2C]/35"
              />
            </label>
            {error && <p role="alert" className="text-sm text-rose-200">{error}</p>}
            <button
              type="submit"
              disabled={isBusy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#A57F2C] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8b6b25] disabled:cursor-wait disabled:opacity-65"
            >
              {isBusy ? 'Validando…' : 'Continuar'}
              {!isBusy && <ArrowRight className="h-4 w-4" />}
            </button>
            <button type="button" onClick={onCancel} className="inline-flex items-center gap-2 text-sm text-white/70 underline underline-offset-4 hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Volver
            </button>
          </form>
        )}
      </div>
    </section>
  );
}