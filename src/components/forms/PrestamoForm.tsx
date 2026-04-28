'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  prestamoSchema,
  type PrestamoData,
  PRESTAMO_LIMITE_ESTANDAR,
} from '@/lib/forms/schemas/prestamo';
import { submitRequestAction } from '@/lib/approvals/submit';
import { collectErrorMessages } from '@/lib/forms/error-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function PrestamoForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showEscalationDialog, setShowEscalationDialog] = useState(false);
  const [confirmedHighAmount, setConfirmedHighAmount] = useState(false);

  const form = useForm<PrestamoData>({
    resolver: zodResolver(prestamoSchema),
    defaultValues: {
      monto_solicitado: 0,
      descuento_propuesto: 0,
      motivo: '',
      acepta_descuento_liquidacion: false as unknown as true,
    },
  });

  const montoActual = form.watch('monto_solicitado');

  async function onSubmit(values: PrestamoData) {
    setSubmitError(null);

    if (
      values.monto_solicitado > PRESTAMO_LIMITE_ESTANDAR &&
      !confirmedHighAmount
    ) {
      setShowEscalationDialog(true);
      return;
    }

    try {
      const res = await submitRequestAction({
        typeCode: 'PRESTAMO',
        formData: values,
        attachments: [],
      });
      router.push(`/solicitudes/${res.requestId}`);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Error al enviar');
    }
  }

  function handleReducirA250() {
    form.setValue('monto_solicitado', PRESTAMO_LIMITE_ESTANDAR, {
      shouldValidate: true,
      shouldDirty: true,
    });
    setConfirmedHighAmount(true);
    setShowEscalationDialog(false);
    // Re-disparar submit con el nuevo monto
    void form.handleSubmit(onSubmit)();
  }

  function handleContinuarConMonto() {
    setConfirmedHighAmount(true);
    setShowEscalationDialog(false);
    // Re-disparar submit; ahora confirmedHighAmount = true permite continuar
    void form.handleSubmit(onSubmit)();
  }

  return (
    <>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6 max-w-2xl"
      >
        <fieldset className="space-y-1">
          <Label htmlFor="monto_solicitado" className="text-base font-semibold">
            Monto solicitado (USD)
          </Label>
          <Input
            id="monto_solicitado"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            {...form.register('monto_solicitado', { valueAsNumber: true })}
          />
        </fieldset>

        <fieldset className="space-y-1">
          <Label
            htmlFor="descuento_propuesto"
            className="text-base font-semibold"
          >
            Descuento propuesto por bisemana (USD)
          </Label>
          <Input
            id="descuento_propuesto"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            {...form.register('descuento_propuesto', { valueAsNumber: true })}
          />
        </fieldset>

        <fieldset className="space-y-1">
          <Label htmlFor="motivo" className="text-base font-semibold">
            Motivo de la solicitud
          </Label>
          <textarea
            id="motivo"
            {...form.register('motivo')}
            rows={4}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="Describe a qué destinarás el préstamo y por qué lo necesitas (mínimo 30 caracteres)."
          />
          <p className="text-xs text-neutral-600">
            Sé específico — la regla del IC-RH-D-02 indica que motivos vagos
            demoran la aprobación.
          </p>
        </fieldset>

        <fieldset className="space-y-1">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              {...form.register('acepta_descuento_liquidacion')}
              className="h-4 w-4 mt-0.5"
            />
            <span>
              Acepto que en caso de liquidación, el saldo pendiente se descuente
              de mi liquidación final.
            </span>
          </label>
        </fieldset>

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

      <Dialog
        open={showEscalationDialog}
        onOpenChange={setShowEscalationDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Monto excede el límite estándar</DialogTitle>
            <DialogDescription>
              <span aria-hidden="true">⚠️ </span>
              Este monto excede el límite estándar de{' '}
              <strong>${PRESTAMO_LIMITE_ESTANDAR}</strong> establecido en{' '}
              <strong>IC-RH-D-02</strong>. Tu solicitud requerirá aprobación
              adicional de Presidencia, lo cual puede tardar más.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm">¿Deseas continuar?</p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleReducirA250}
            >
              Reducir a ${PRESTAMO_LIMITE_ESTANDAR}
            </Button>
            <Button type="button" onClick={handleContinuarConMonto}>
              Continuar con ${formatMonto(montoActual)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function formatMonto(n: number): string {
  if (typeof n !== 'number' || Number.isNaN(n)) return '0.00';
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function FormErrors({ errors }: { errors: FieldErrors<PrestamoData> }) {
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
