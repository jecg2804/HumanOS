'use client';
import { useActionState, useEffect } from 'react';
import { reportOnboardingErrorAction } from '@/lib/onboarding/actions';
import type { WizardState, WizardAction } from './WizardReducer';

type FormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  data?: unknown;
};

const initialFormState: FormState = { ok: false };

interface Props {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
  onClose: () => void;
}

export function HayErrorModal({ state, dispatch, onClose }: Props) {
  const [actionState, formAction, pending] = useActionState(
    reportOnboardingErrorAction,
    initialFormState
  );

  useEffect(() => {
    if (actionState.ok && actionState.data) {
      const d = actionState.data as {
        severity: 'leve' | 'critica';
        should_pause_wizard: boolean;
      };
      if (d.should_pause_wizard) {
        dispatch({ type: 'PAUSE_CRITICAL_ERROR' });
      } else {
        onClose();
        dispatch({ type: 'NEXT_STEP' });
      }
    }
  }, [actionState, dispatch, onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-lg font-bold">Reportar error en tus datos</h2>
        <form action={formAction} className="space-y-4 mt-4">
          <input type="hidden" name="person_id" value={state.validated?.person_id ?? ''} />
          <input type="hidden" name="token" value={state.validated?.token ?? ''} />
          <div>
            <label className="block text-sm font-medium mb-1">Severidad</label>
            <select name="severity" className="w-full p-3 border rounded" defaultValue="">
              <option value="" disabled>
                Selecciona…
              </option>
              <option value="leve">
                Leve — puedo continuar (cargo levemente distinto, departamento mal categorizado)
              </option>
              <option value="critica">
                Crítica — no debo continuar (nombre mal escrito, cédula incorrecta, supervisor
                incorrecto)
              </option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Describe el error</label>
            <textarea
              name="description"
              rows={4}
              required
              minLength={5}
              className="w-full p-3 border rounded"
              placeholder="Mi cargo dice 'Ingeniero' pero soy 'Ingeniero Civil Senior'"
            />
          </div>
          {actionState.errors && (
            <ul className="text-sm text-red-600">
              {Object.entries(actionState.errors).map(([k, v]) => (
                <li key={k}>{v?.[0]}</li>
              ))}
            </ul>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="px-4 py-2 bg-[#1B3A5C] text-white rounded disabled:opacity-50"
            >
              {pending ? 'Enviando…' : 'Enviar reporte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
