'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { vacacionesSchema, type VacacionesData } from '@/lib/forms/schemas/vacaciones';
import { submitRequestAction } from '@/lib/approvals/submit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const PAGO_OPTS = [
  'Completas',
  'Adelanto sobre acumulado',
  'Descuento de días solicitados',
] as const;

const TIEMPO_OPTS = ['Completas', 'Parciales'] as const;

export function VacacionesForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<VacacionesData>({
    resolver: zodResolver(vacacionesSchema),
    defaultValues: {
      pago_vacaciones: 'Completas',
      tiempo_solicitado: 'Completas',
      desglose: [{ desde: '', hasta: '' }],
      observaciones: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'desglose',
  });

  const tiempo = form.watch('tiempo_solicitado');

  async function onSubmit(values: VacacionesData) {
    setSubmitError(null);
    try {
      const res = await submitRequestAction({
        typeCode: 'VACACIONES',
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
        <Label className="text-base font-semibold">Pago de Vacaciones</Label>
        <div className="space-y-1.5">
          {PAGO_OPTS.map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                value={opt}
                {...form.register('pago_vacaciones')}
                className="h-4 w-4"
              />
              {opt}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <Label className="text-base font-semibold">Tiempo Solicitado</Label>
        <div className="space-y-1.5">
          {TIEMPO_OPTS.map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                value={opt}
                {...form.register('tiempo_solicitado')}
                className="h-4 w-4"
              />
              {opt}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <Label className="text-base font-semibold">Desglose del tiempo a solicitar</Label>
        {fields.map((f, i) => (
          <div key={f.id} className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <div className="flex-1">
              <Label htmlFor={`desde-${i}`} className="text-xs">
                Del
              </Label>
              <Input
                id={`desde-${i}`}
                type="date"
                {...form.register(`desglose.${i}.desde` as const)}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor={`hasta-${i}`} className="text-xs">
                Al
              </Label>
              <Input
                id={`hasta-${i}`}
                type="date"
                {...form.register(`desglose.${i}.hasta` as const)}
              />
            </div>
            {i > 0 && (
              <Button type="button" variant="outline" size="sm" onClick={() => remove(i)}>
                Quitar
              </Button>
            )}
          </div>
        ))}
        {tiempo === 'Parciales' && fields.length < 3 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ desde: '', hasta: '' })}
          >
            + Agregar rango
          </Button>
        )}
      </fieldset>

      <fieldset className="space-y-1">
        <Label htmlFor="observaciones">Observaciones (opcional)</Label>
        <textarea
          id="observaciones"
          {...form.register('observaciones')}
          rows={3}
          className="w-full border rounded px-3 py-2 text-sm"
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

function FormErrors({ errors }: { errors: FieldErrors<VacacionesData> }) {
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

function collectErrorMessages(errors: FieldErrors<VacacionesData>): string[] {
  const out: string[] = [];
  function walk(node: unknown) {
    if (!node || typeof node !== 'object') return;
    const obj = node as Record<string, unknown>;
    if (typeof obj.message === 'string') out.push(obj.message);
    for (const k of Object.keys(obj)) {
      if (k !== 'message' && k !== 'ref' && k !== 'type') walk(obj[k]);
    }
  }
  walk(errors);
  return Array.from(new Set(out));
}
