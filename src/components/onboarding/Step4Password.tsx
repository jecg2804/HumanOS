'use client';
import { useState } from 'react';
import { Step4Schema } from '@/lib/onboarding/validation';
import type { WizardState, WizardAction } from './WizardReducer';

interface Props {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

export function Step4Password({ state, dispatch }: Props) {
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    const r = Step4Schema.safeParse({ password: state.password });
    if (!r.success) {
      setError(r.error.issues[0]?.message ?? 'Contraseña inválida');
      return;
    }
    setError(null);
    dispatch({ type: 'NEXT_STEP' });
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold text-[#1B3A5C]">Elige una contraseña</h1>
      <p className="text-gray-700">
        Mínimo 10 caracteres. Usamos una verificación contra bases de contraseñas filtradas — si
        eliges una comprometida, te pediremos otra.
      </p>
      <input
        type="password"
        value={state.password}
        onChange={(e) =>
          dispatch({ type: 'SET_FIELD', key: 'password', value: e.target.value })
        }
        minLength={10}
        autoFocus
        className="w-full p-3 border rounded-md"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => dispatch({ type: 'PREV_STEP' })}
          className="px-4 py-2 border rounded"
        >
          Atrás
        </button>
        <button
          onClick={handleNext}
          className="flex-1 bg-[#1B3A5C] text-white py-3 rounded-md font-medium"
        >
          Continuar
        </button>
      </div>
    </section>
  );
}
