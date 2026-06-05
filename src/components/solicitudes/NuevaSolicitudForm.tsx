'use client';
// New-request form (VACACIONES worked example). Composes the generic FormFieldsRenderer with the
// submit flow: gathers user_input, calls the server action (passed in so the component stays reusable
// across forms — ADR-0015), and on success routes to the new ticket. The supervisor that will approve
// is resolved server-side from the requester's employment (shown read-only); a full override picker
// (allow_supervisor_override, R6/R10) is a follow-up.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { FormFieldsRenderer } from './FormFieldsRenderer';
import { workingDays, readDateRanges } from '@/lib/engines/form';
import type { FormSchema } from '@/lib/engines/types';

export interface NuevaSolicitudResult {
  ok: boolean;
  message?: string;
  errors?: { key: string; message: string }[];
  data?: { ticketId: string; ticketNumber: string; status: string };
}

export interface NuevaSolicitudFormProps {
  typeName: string;
  schema: FormSchema;
  /** profile + computed values resolved server-side (read-only display). */
  prefill: Record<string, unknown>;
  /** name of the supervisor who will approve (employment supervisor), or null. */
  supervisorName: string | null;
  /** the server action that creates the ticket. */
  onSubmit: (input: {
    userInput: Record<string, unknown>;
    selectedSupervisorId?: string | null;
  }) => Promise<NuevaSolicitudResult>;
}

export function NuevaSolicitudForm({
  typeName,
  schema,
  prefill,
  supervisorName,
  onSubmit,
}: NuevaSolicitudFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = (key: string, value: unknown) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  // Live computed values: dias_solicitados from the date ranges (same workingDays the submit RPC
  // trusts; ADR-0015). Merged over the server prefill so the "Calculado" field updates as the user
  // picks dates instead of showing "—" until submit.
  const dias = workingDays(readDateRanges(values.date_ranges));
  const saldo = typeof prefill.saldo_vacaciones === 'number' ? prefill.saldo_vacaciones : null;
  const overBalance = saldo != null && dias > saldo;
  const livePrefill = { ...prefill, dias_solicitados: dias > 0 ? dias : '—' };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setMessage(null);
    startTransition(async () => {
      const res = await onSubmit({ userInput: values, selectedSupervisorId: null });
      if (res.ok && res.data) {
        router.push(`/solicitudes/${res.data.ticketId}`);
        return;
      }
      if (res.errors?.length) {
        setErrors(Object.fromEntries(res.errors.map((er) => [er.key, er.message])));
      }
      setMessage(res.message ?? 'No se pudo enviar la solicitud.');
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <FormFieldsRenderer
        schema={schema}
        prefill={livePrefill}
        values={values}
        onChange={set}
        errors={errors}
        disabled={pending}
      />

      {overBalance && (
        <p role="alert" className="text-sm text-red-600">
          Días solicitados ({dias}) excede tu saldo disponible ({saldo}).
        </p>
      )}

      <div className="rounded-md bg-navy-50 border border-navy-100 p-3 text-sm text-navy-700">
        {supervisorName ? (
          <>
            Tu solicitud la autorizará tu supervisor:{' '}
            <strong>{supervisorName}</strong>. Recursos Humanos la recibe y verifica primero.
          </>
        ) : (
          <>
            No tienes un supervisor asignado, así que Recursos Humanos actuará en su lugar.
          </>
        )}
      </div>

      {message && (
        <p role="alert" className="text-sm text-red-600">
          {message}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending || overBalance || dias <= 0}
          className="bg-navy-500 text-white py-3 px-6 rounded-md font-medium disabled:opacity-50"
        >
          {pending ? 'Enviando…' : `Enviar ${typeName}`}
        </button>
        <button
          type="button"
          onClick={() => router.push('/solicitudes')}
          disabled={pending}
          className="py-3 px-6 rounded-md font-medium text-navy-600 hover:bg-gray-100"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
