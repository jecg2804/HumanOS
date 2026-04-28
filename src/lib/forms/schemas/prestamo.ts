import { z } from 'zod';

export const PRESTAMO_LIMITE_ESTANDAR = 250;

export const prestamoSchema = z
  .object({
    monto_solicitado: z
      .number()
      .positive('Monto debe ser mayor a 0')
      .multipleOf(0.01, 'Máximo 2 decimales'),
    descuento_propuesto: z
      .number()
      .positive('Descuento debe ser mayor a 0')
      .multipleOf(0.01),
    motivo: z
      .string()
      .min(30, 'Sé específico — mínimo 30 caracteres (regla del IC-RH-D-02 para evitar demoras)'),
    acepta_descuento_liquidacion: z.literal(true, {
      message: 'Debes aceptar que el saldo pendiente se descuente de tu liquidación',
    }),
  })
  .refine((d) => d.descuento_propuesto <= d.monto_solicitado, {
    message: 'El descuento por bisemana no puede exceder el monto solicitado',
    path: ['descuento_propuesto'],
  });

export type PrestamoData = z.infer<typeof prestamoSchema>;
