'use client';
import { useState } from 'react';
import { Step2Schema } from '@/lib/onboarding/validation';
import type { WizardState, WizardAction } from './WizardReducer';

interface Props {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

export function Step2Identity({ state, dispatch }: Props) {
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    const r = Step2Schema.safeParse({ cedula: state.cedula, employee_code: state.employee_code });
    if (!r.success) {
      setError(r.error.issues[0]?.message ?? 'Datos inválidos');
      return;
    }
    setError(null);
    dispatch({ type: 'NEXT_STEP' });
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold text-[#1B3A5C]">Verifica tu identidad</h1>
      <p className="text-gray-700">
        Para confirmar que el código es tuyo, ingresa tu cédula (o pasaporte) y
        opcionalmente tu código de empleado.
      </p>
      <div>
        <label className="block text-sm font-medium mb-1">Cédula o pasaporte</label>
        <input
          type="text"
          value={state.cedula}
          onChange={(e) =>
            dispatch({ type: 'SET_FIELD', key: 'cedula', value: e.target.value })
          }
          placeholder="8-123-456"
          className="w-full p-3 border rounded-md"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Código de empleado (opcional)</label>
        <input
          type="text"
          value={state.employee_code}
          onChange={(e) =>
            dispatch({
              type: 'SET_FIELD',
              key: 'employee_code',
              value: e.target.value.toUpperCase(),
            })
          }
          placeholder="VAL130"
          className="w-full p-3 border rounded-md uppercase"
        />
      </div>
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
