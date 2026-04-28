import type { Metadata } from 'next';
import { loginAction } from './actions';

export const metadata: Metadata = {
  title: 'Iniciar sesión — HumanOS',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const nextPath = sp.next ?? '/inicio';

  return (
    <main
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: '#1B3A5C' }}
    >
      <form
        action={loginAction}
        className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md space-y-4"
      >
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2">
            <span style={{ color: '#F5A623' }} className="font-bold text-2xl">
              ICONSA
            </span>
            <span style={{ color: '#122740' }} className="font-semibold">
              HumanOS
            </span>
          </div>
        </div>
        <input type="hidden" name="next" value={nextPath} />
        <label className="block">
          <span className="text-sm font-medium">Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            autoFocus
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Contraseña</span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </label>
        {sp.error && (
          <p className="text-sm" style={{ color: '#C0392B' }}>
            {sp.error}
          </p>
        )}
        <button
          type="submit"
          className="w-full text-white py-2 rounded transition"
          style={{ background: '#1B3A5C' }}
        >
          Entrar
        </button>
      </form>
    </main>
  );
}
