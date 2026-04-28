'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  accionPersonalSchema,
  type AccionPersonalData,
  ACCION_SUB_TIPOS,
} from '@/lib/forms/schemas/accion-personal';
import { submitRequestAction } from '@/lib/approvals/submit';
import { collectErrorMessages } from '@/lib/forms/error-utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

type Subordinate = { id: string; name: string; code: string };

type Props = {
  me: { id: string; name: string; role: 'employee' | 'supervisor' | 'hr_admin' };
  subordinates: Subordinate[];
};

export function AccionPersonalForm({ me, subordinates }: Props) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const canChooseOther = me.role !== 'employee' && subordinates.length > 0;

  const form = useForm<AccionPersonalData>({
    resolver: zodResolver(accionPersonalSchema),
    defaultValues: {
      sub_tipo: 'Aumento de Salario',
      empleado_objeto_id: me.id,
      observaciones: '',
    },
  });

  const subTipo = form.watch('sub_tipo');

  async function onSubmit(values: AccionPersonalData) {
    setSubmitError(null);
    try {
      const res = await submitRequestAction({
        typeCode: 'ACCION_PERSONAL',
        formData: values,
        attachments: [],
      });
      router.push(`/solicitudes/${res.requestId}`);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Error al enviar');
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <fieldset className="space-y-2">
        <Label htmlFor="sub_tipo" className="text-base font-semibold">
          Sub-tipo de acción
        </Label>
        <select
          id="sub_tipo"
          {...form.register('sub_tipo')}
          className="w-full border rounded px-3 py-2 text-sm bg-white"
        >
          {ACCION_SUB_TIPOS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        {subTipo === 'Autorización de Horas Extras' && (
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 leading-relaxed">
            <span aria-hidden="true">ℹ️ </span>
            La autorización de Horas Extras desde Acción de Personal aplica para horas
            YA TRABAJADAS (post-facto, para entrar a planilla). La autorización previa
            para trabajar overtime es un proceso aparte que estará disponible
            próximamente.
          </div>
        )}
      </fieldset>

      <fieldset className="space-y-2">
        <Label htmlFor="empleado_objeto_id" className="text-base font-semibold">
          Empleado objeto de la acción
        </Label>
        {canChooseOther ? (
          <select
            id="empleado_objeto_id"
            {...form.register('empleado_objeto_id')}
            className="w-full border rounded px-3 py-2 text-sm bg-white"
          >
            <option value={me.id}>Para mí ({me.name})</option>
            {subordinates.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        ) : (
          <>
            <input type="hidden" {...form.register('empleado_objeto_id')} />
            <p className="text-sm text-neutral-700">
              Solicitud para: <span className="font-medium">{me.name}</span>
            </p>
          </>
        )}
      </fieldset>

      <fieldset className="space-y-1">
        <Label htmlFor="observaciones">Observaciones</Label>
        <textarea
          id="observaciones"
          {...form.register('observaciones')}
          rows={4}
          className="w-full border rounded px-3 py-2 text-sm"
          placeholder="Describe el motivo y detalles de la acción solicitada (mínimo 10 caracteres)."
        />
      </fieldset>

      <FormErrors errors={form.formState.errors} />
      {submitError && <p className="text-sm text-red-600">{submitError}</p>}

      <div className="flex gap-2 sticky bottom-0 bg-white py-3 border-t md:border-t-0 md:relative md:bg-transparent">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Enviando…' : 'Enviar solicitud'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push('/solicitudes/nueva')}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function FormErrors({ errors }: { errors: FieldErrors<AccionPersonalData> }) {
  const messages = collectErrorMessages(errors);
  if (messages.length === 0) return null;
  return (
    <ul className="text-sm text-red-600 space-y-0.5">
      {messages.map((m, i) => (
        <li key={i}>• {m}</li>
      ))}
    </ul>
  );
}
