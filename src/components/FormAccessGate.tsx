import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, KeyRound } from 'lucide-react';
import { supabaseClient } from '../services/supabaseClient';
import type { RespuestaItem } from '../types/form';

export type FormAccessSession = {
  credentialId: string;
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

interface FormAccessGateProps {
  onSelect: (access: FormAccessSession) => void;
  onCancel: () => void;
}

export function FormAccessGate({ onSelect, onCancel }: FormAccessGateProps) {
  const [password, setPassword] = useState('');
  const [completedInfo, setCompletedInfo] = useState<{ clave: string; anio: string; folio: string } | null>(null);
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

    if (data.completed) {
      setCompletedInfo({ clave: data.clave, anio: data.anio, folio: data.folio || '' });
      setPassword('');
      setIsBusy(false);
      return;
    }

    if (!data.credentialId || !data.entryId || !data.titularId || !data.clave || !data.anio) {
      setError('La asignación de esta contraseña está incompleta. Contacta a la persona administradora.');
      setIsBusy(false);
      return;
    }

    onSelect({
      credentialId: data.credentialId,
      entryId: data.entryId,
      password,
      titularId: data.titularId,
      titularNombre: data.nombre,
      titularCorreo: data.correo,
      clave: data.clave,
      anio: data.anio,
      formularioId: data.formularioId ?? null,
      folio: data.folio ?? '',
      answers: data.answers ?? {},
      submittedSections: Array.isArray(data.submittedSections) ? data.submittedSections : [],
    });
    setIsBusy(false);
  };

  return (
    <section className="mx-auto flex min-h-[60vh] w-full max-w-xl items-center px-4 py-10">
      <div className="w-full rounded-xl border border-[#A57F2C]/35 bg-[#002F2A]/90 p-6 text-white shadow-2xl sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#A57F2C]/50 bg-[#611232]/60 text-[#f0d790]">
            {completedInfo ? <CheckCircle2 className="h-5 w-5" /> : <KeyRound className="h-5 w-5" />}
          </span>
          <div>
            <h2 className="text-lg font-semibold">Acceso al formulario</h2>
            <p className="text-sm text-white/70">Ingresa la contraseña asignada a esta clave y año.</p>
          </div>
        </div>

        {completedInfo ? (
          <div className="space-y-4">
            <p role="status" className="text-sm text-white/85">
              El cuestionario {completedInfo.clave}/{completedInfo.anio} ya fue concluido.
              {completedInfo.folio && <> Folio: <strong>{completedInfo.folio}</strong>.</>}
            </p>
            <p className="text-xs text-white/60">La finalización solo bloquea esta asignación; no afecta a otros titulares.</p>
            <button type="button" onClick={onCancel} className="inline-flex items-center gap-2 text-sm text-white/75 underline underline-offset-4 hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Volver
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