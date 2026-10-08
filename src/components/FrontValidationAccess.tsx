import { useState } from 'react';
import { ArrowLeft, LockKeyhole } from 'lucide-react';

interface FrontValidationAccessProps {
  onClose: () => void;
}

const VALIDATION_USER = 'add.31';
const VALIDATION_PASSWORD = '3180';

export function FrontValidationAccess({ onClose }: FrontValidationAccessProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (username === VALIDATION_USER && password === VALIDATION_PASSWORD) {
      setIsAuthenticated(true);
      setError('');
      return;
    }
    setError('Usuario o contraseña incorrectos.');
  };

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

      {isAuthenticated ? (
        <section className="mx-auto max-w-3xl rounded-xl border border-[#A57F2C]/35 bg-[#002F2A]/85 p-6 text-white shadow-lg backdrop-blur-sm">
          <h3 className="text-lg font-semibold">Tabla pendiente de estructura</h3>
          <p className="mt-2 text-sm text-white/85">
            La vista queda lista. No se consultan tablas hasta definir su estructura.
          </p>
        </section>
      ) : (
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
      )}
    </section>
  );
}