'use client';
import { useState } from 'react';
import { Step1Schema } from '@/lib/onboarding/validation';
import type { WizardState, WizardAction } from './WizardReducer';

interface Props {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

export function Step1Code({ state, dispatch }: Props) {
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    const r = Step1Schema.safeParse({ code: state.code });
    if (!r.success) {
      setError(r.error.issues[0]?.message ?? 'Código inválido');
      return;
    }
    setError(null);
    dispatch({ type: 'NEXT_STEP' });
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold text-[#1B3A5C]">Bienvenido</h1>
      <p className="text-gray-700">
        Ingresa el código de 8 caracteres que recibiste de Recursos Humanos.
      </p>
      <input
        type="text"
        value={state.code}
        onChange={(e) =>
          dispatch({ type: 'SET_FIELD', key: 'code', value: e.target.value.toUpperCase() })
        }
        placeholder="ABCD1234"
        maxLength={8}
        autoFocus
        className="w-full text-center text-2xl font-mono tracking-widest p-4 border-2 rounded-md uppercase"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        onClick={handleNext}
        disabled={state.code.length !== 8}
        className="w-full bg-[#1B3A5C] text-white py-3 rounded-md font-medium disabled:opacity-50"
      >
        Continuar
      </button>
    </section>
  );
}
