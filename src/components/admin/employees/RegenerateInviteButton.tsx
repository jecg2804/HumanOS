'use client';
import { useActionState } from 'react';
import { regenerateInviteCodeAction } from '@/lib/admin/employees-actions';

type FormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  data?: unknown;
};
const initial: FormState = { ok: false };

interface Props {
  personId: string;
  deliveryTarget: string;
}

export function RegenerateInviteButton({ personId, deliveryTarget }: Props) {
  const [state, formAction, pending] = useActionState(regenerateInviteCodeAction, initial);

  return (
    <form action={formAction}>
      <input type="hidden" name="person_id" value={personId} />
      <input type="hidden" name="delivery_target" value={deliveryTarget} />
      <button
        type="submit"
        disabled={pending}
        className="bg-[#F0A500] text-[#1B3A5C] px-3 py-1.5 rounded text-sm font-medium disabled:opacity-50"
      >
        {pending ? 'Regenerando…' : 'Regenerar código de invitación'}
      </button>
      {state.ok && !!state.data && (
        <div className="text-sm text-green-700 mt-2">
          Nuevo código:{' '}
          <span className="font-mono font-bold">
            {(state.data as { code: string }).code}
          </span>
        </div>
      )}
      {state.message && <p className="text-sm text-red-600 mt-2">{state.message}</p>}
    </form>
  );
}
