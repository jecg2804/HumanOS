'use client';
import { useActionState } from 'react';
import { setNewPasswordAction } from './actions';

type FormState = { ok: boolean; message?: string };
const initial: FormState = { ok: false };

export default function ResetPasswordPage() {
  const [state, formAction, pending] = useActionState(setNewPasswordAction, initial);
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold text-[#1B3A5C]">Nueva contraseña</h1>
        <p className="text-gray-700 mt-2 text-sm">
          Mínimo 10 caracteres. No reutilices contraseñas anteriores.
        </p>
        <form action={formAction} className="space-y-4 mt-4">
          <input
            name="password"
            type="password"
            placeholder="Nueva contraseña"
            minLength={10}
            required
            className="w-full p-3 border rounded"
          />
          {state.message && <p className="text-sm text-red-600">{state.message}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full bg-[#1B3A5C] text-white py-3 rounded-md font-medium disabled:opacity-50"
          >
            {pending ? 'Guardando…' : 'Actualizar contraseña'}
          </button>
        </form>
      </div>
    </main>
  );
}
