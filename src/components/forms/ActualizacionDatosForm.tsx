'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  actualizacionDatosSchema,
  type ActualizacionDatosData,
  ESTADOS_CIVILES,
} from '@/lib/forms/schemas/actualizacion-datos';

// El schema usa `.default([])` en dependientes, así que el tipo de entrada
// (lo que el form maneja antes de validar) y el de salida (lo que usa el server)
// difieren. Para que `useForm` y `zodResolver` cuadren tipamos por separado.
type ActualizacionDatosInput = z.input<typeof actualizacionDatosSchema>;
import { submitRequestAction } from '@/lib/approvals/submit';
import { collectErrorMessages } from '@/lib/forms/error-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Props = {
  initialValues: ActualizacionDatosData;
};

/**
 * Compara recursivamente dos valores y devuelve la lista de paths (notación con
 * puntos) que difieren. Para arrays/objetos compara por JSON.stringify.
 */
export function computeChanges(
  initial: ActualizacionDatosData,
  current: ActualizacionDatosData,
): string[] {
  const changes: string[] = [];

  function diff(a: unknown, b: unknown, path: string) {
    // Tratamos undefined y '' como equivalentes para campos opcionales tipo string.
    const aNorm = a === undefined ? '' : a;
    const bNorm = b === undefined ? '' : b;

    if (
      aNorm !== null &&
      bNorm !== null &&
      typeof aNorm === 'object' &&
      typeof bNorm === 'object' &&
      !Array.isArray(aNorm) &&
      !Array.isArray(bNorm)
    ) {
      const keys = new Set([
        ...Object.keys(aNorm as Record<string, unknown>),
        ...Object.keys(bNorm as Record<string, unknown>),
      ]);
      for (const k of keys) {
        diff(
          (aNorm as Record<string, unknown>)[k],
          (bNorm as Record<string, unknown>)[k],
          path ? `${path}.${k}` : k,
        );
      }
      return;
    }

    if (Array.isArray(aNorm) || Array.isArray(bNorm)) {
      if (JSON.stringify(aNorm) !== JSON.stringify(bNorm)) {
        changes.push(path);
      }
      return;
    }

    if (aNorm !== bNorm) {
      changes.push(path);
    }
  }

  diff(initial, current, '');
  return changes;
}

export function ActualizacionDatosForm({ initialValues }: Props) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<
    ActualizacionDatosInput,
    unknown,
    ActualizacionDatosData
  >({
    resolver: zodResolver(actualizacionDatosSchema),
    defaultValues: initialValues as ActualizacionDatosInput,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'dependientes',
  });

  const estadoCivil = form.watch('estado_civil');
  const dependientesCount = form.watch('dependientes')?.length ?? 0;
  const requierePareja =
    estadoCivil === 'Casado(a)' || estadoCivil === 'Unido(a)';

  async function onSubmit(values: ActualizacionDatosData) {
    setSubmitError(null);

    const changedPaths = computeChanges(initialValues, values);
    if (changedPaths.length === 0) {
      setSubmitError(
        'No hiciste cambios. Modifica al menos un campo o cancela.',
      );
      return;
    }

    try {
      const res = await submitRequestAction({
        typeCode: 'ACTUALIZACION_DATOS',
        formData: { ...values, _changes: changedPaths },
        attachments: [],
      });
      router.push(`/solicitudes/${res.requestId}`);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Error al enviar');
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-6 max-w-2xl"
    >
      <Card>
        <CardHeader>
          <CardTitle>Dirección</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="calle_barriada">Calle / Barriada</Label>
            <Input
              id="calle_barriada"
              {...form.register('direccion.calle_barriada')}
              placeholder="Ej: Calle 50, Barrio El Carmen"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="apartamento_casa_no">
              Apartamento / Casa No. (opcional)
            </Label>
            <Input
              id="apartamento_casa_no"
              {...form.register('direccion.apartamento_casa_no')}
              placeholder="Ej: Apto 12B"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Teléfonos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="telefono_casa">Teléfono de casa (opcional)</Label>
            <Input
              id="telefono_casa"
              type="tel"
              inputMode="tel"
              {...form.register('telefono_casa')}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="celular_personal">Celular personal</Label>
            <Input
              id="celular_personal"
              type="tel"
              inputMode="tel"
              {...form.register('celular_personal')}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Estado civil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="estado_civil">Estado civil actual</Label>
            <select
              id="estado_civil"
              {...form.register('estado_civil')}
              className="w-full border rounded px-3 py-2 text-sm bg-white"
            >
              {ESTADOS_CIVILES.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {requierePareja && (
            <div className="space-y-3 rounded-md border border-neutral-200 bg-neutral-50 p-3">
              <p className="text-xs text-neutral-700">
                Datos de tu pareja (requeridos cuando el estado civil es{' '}
                {estadoCivil}).
              </p>
              <div className="space-y-1">
                <Label htmlFor="pareja_nombre">Nombre completo</Label>
                <Input
                  id="pareja_nombre"
                  {...form.register('pareja.nombre')}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pareja_telefono">Teléfono</Label>
                <Input
                  id="pareja_telefono"
                  type="tel"
                  inputMode="tel"
                  {...form.register('pareja.telefono')}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dependientes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-neutral-600">
            Tienes {dependientesCount}{' '}
            {dependientesCount === 1
              ? 'dependiente registrado'
              : 'dependientes registrados'}
            .
          </p>

          {fields.map((f, i) => (
            <div
              key={f.id}
              className="flex flex-col sm:flex-row gap-2 sm:items-end"
            >
              <div className="flex-1 space-y-1">
                <Label htmlFor={`dep-nombre-${i}`} className="text-xs">
                  Nombre
                </Label>
                <Input
                  id={`dep-nombre-${i}`}
                  {...form.register(`dependientes.${i}.nombre` as const)}
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label htmlFor={`dep-parentesco-${i}`} className="text-xs">
                  Parentesco
                </Label>
                <Input
                  id={`dep-parentesco-${i}`}
                  placeholder="Ej: Hijo, Madre"
                  {...form.register(`dependientes.${i}.parentesco` as const)}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => remove(i)}
              >
                Quitar
              </Button>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ nombre: '', parentesco: '' })}
          >
            + Agregar dependiente
          </Button>
        </CardContent>
      </Card>

      <FormErrors errors={form.formState.errors} />
      {submitError && <p className="text-sm text-red-600">{submitError}</p>}

      <div className="flex gap-2 sticky bottom-0 bg-white py-3 border-t md:border-t-0 md:relative md:bg-transparent">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Enviando…' : 'Enviar solicitud'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/solicitudes/nueva')}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function FormErrors({
  errors,
}: {
  errors: FieldErrors<ActualizacionDatosInput>;
}) {
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
