'use client';
import { useActionState, useEffect } from 'react';
import { validateInviteCodeAction } from '@/lib/onboarding/actions';
import type { WizardState, WizardAction, ValidatedContext } from './WizardReducer';

interface Props {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

type FormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  data?: unknown;
};

const initialFormState: FormState = { ok: false };

export function Step3Identifier({ state, dispatch }: Props) {
  const [actionState, formAction, pending] = useActionState(
    validateInviteCodeAction,
    initialFormState
  );

  useEffect(() => {
    if (actionState.ok && actionState.data) {
      const ctx = actionState.data as ValidatedContext;
      dispatch({
        type: 'VALIDATED',
        payload: ctx,
        code: state.code,
        cedula: state.cedula,
        employee_code: state.employee_code,
        delivery_target: state.delivery_target,
      });
    }
  }, [
    actionState,
    dispatch,
    state.code,
    state.cedula,
    state.employee_code,
    state.delivery_target,
  ]);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold text-navy-500">¿Cómo te contactamos?</h1>
      <p className="text-gray-700">
        Ingresa tu correo empresarial (recomendado) o tu número de teléfono. Si ya tienes cuenta en
        MovimientOS u otra app de ICONSA, usa el mismo dato para que no se duplique.
      </p>
      <p className="text-sm text-gray-500">
        Si no tienes correo, te creamos una cuenta interna: podrás iniciar sesión con tu código de
        empleado y la contraseña que elijas en el siguiente paso.
      </p>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="code" value={state.code} />
        <input type="hidden" name="cedula" value={state.cedula} />
        <input type="hidden" name="employee_code" value={state.employee_code} />
        <input
          name="delivery_target"
          type="text"
          aria-label="Correo empresarial o número de teléfono"
          value={state.delivery_target}
          onChange={(e) =>
            dispatch({ type: 'SET_FIELD', key: 'delivery_target', value: e.target.value })
          }
          placeholder="ejemplo@iconsanet.com o +50761234567"
          className="w-full p-3 border rounded-md"
        />
        {actionState.message && <p role="alert" className="text-sm text-red-600">{actionState.message}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => dispatch({ type: 'PREV_STEP' })}
            className="px-4 py-2 border rounded"
          >
            Atrás
          </button>
          <button
            type="submit"
            disabled={pending}
            className="flex-1 bg-navy-500 text-white py-3 rounded-md font-medium disabled:opacity-50"
          >
            {pending ? 'Verificando…' : 'Continuar'}
          </button>
        </div>
      </form>
    </section>
  );
}
