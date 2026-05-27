'use client';
import { useState } from 'react';
import { Step9Schema } from '@/lib/onboarding/validation';
import type { WizardState, WizardAction } from './WizardReducer';

interface Props {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

export function Step9Acknowledgments({ state, dispatch }: Props) {
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    if (!state.ack_ethics_at || !state.ack_child_labor_at) {
      setError('Debes aceptar ambos documentos para continuar');
      return;
    }
    const r = Step9Schema.safeParse({
      ack_ethics: !!state.ack_ethics_at,
      ack_child_labor: !!state.ack_child_labor_at,
    });
    if (!r.success) {
      setError(r.error.issues[0]?.message ?? 'Datos inválidos');
      return;
    }
    setError(null);
    dispatch({ type: 'NEXT_STEP' });
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold text-[#1B3A5C]">Reconocimientos</h1>
      <p className="text-gray-700">
        Confirma que has leído y aceptas estas políticas de ICONSA.
      </p>
      <label className="flex items-start gap-3 p-4 border rounded-md cursor-pointer">
        <input
          type="checkbox"
          checked={!!state.ack_ethics_at}
          onChange={(e) =>
            dispatch({
              type: 'ACK',
              key: 'ack_ethics_at',
              at: e.target.checked ? new Date().toISOString() : '',
            })
          }
          className="mt-1"
        />
        <div>
          <div className="font-medium">Manual de Ética ICONSA (IC-RH-M-01)</div>
          <p className="text-sm text-gray-600">
            He leído y acepto el Manual de Ética y código de conducta.
          </p>
          <a
            href="/sops/IC-RH-M-01.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#0A6EBD] underline"
          >
            Ver documento (PDF)
          </a>
        </div>
      </label>
      <label className="flex items-start gap-3 p-4 border rounded-md cursor-pointer">
        <input
          type="checkbox"
          checked={!!state.ack_child_labor_at}
          onChange={(e) =>
            dispatch({
              type: 'ACK',
              key: 'ack_child_labor_at',
              at: e.target.checked ? new Date().toISOString() : '',
            })
          }
          className="mt-1"
        />
        <div>
          <div className="font-medium">Política contra Trabajo Infantil (IC-RH-D-07)</div>
          <p className="text-sm text-gray-600">
            He leído y acepto la política de prevención de trabajo infantil y forzado.
          </p>
          <a
            href="/sops/IC-RH-D-07.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#0A6EBD] underline"
          >
            Ver documento (PDF)
          </a>
        </div>
      </label>
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
          className="flex-1 bg-[#1B3A5C] text-white py-3 rounded-md"
        >
          Continuar
        </button>
      </div>
    </section>
  );
}
