'use client';
import { useActionState } from 'react';
import { resetPasswordForEmailAction } from './actions';

type FormState = { ok: boolean; message?: string };
const initial: FormState = { ok: false };

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(resetPasswordForEmailAction, initial);
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold text-[#1B3A5C]">Recuperar contraseña</h1>
        <p className="text-gray-700 mt-2 text-sm">
          Ingresa tu correo empresarial. Si la cuenta existe, te enviamos un enlace.
        </p>
        <form action={formAction} className="space-y-4 mt-4">
          <input
            name="identifier"
            type="text"
            placeholder="ejemplo@iconsanet.com"
            required
            className="w-full p-3 border rounded"
          />
          {state.message && (
            <p className={`text-sm ${state.ok ? 'text-gray-700' : 'text-red-600'}`}>
              {state.message}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full bg-[#1B3A5C] text-white py-3 rounded-md font-medium disabled:opacity-50"
          >
            {pending ? 'Enviando…' : 'Enviar enlace'}
          </button>
        </form>
        <a href="/login" className="text-sm text-[#0A6EBD] underline mt-4 inline-block">
          Volver a iniciar sesión
        </a>
      </div>
    </main>
  );
}
