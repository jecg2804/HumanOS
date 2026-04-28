import { z } from 'zod';

const isFutureOrToday = (d: string): boolean => {
  if (!d) return false;
  const today = new Date(new Date().toDateString());
  return new Date(d) >= today;
};

export const vacacionesSchema = z
  .object({
    pago_vacaciones: z.enum([
      'Completas',
      'Adelanto sobre acumulado',
      'Descuento de días solicitados',
    ]),
    tiempo_solicitado: z.enum(['Completas', 'Parciales']),
    desglose: z
      .array(
        z.object({
          desde: z.string().min(1, 'Fecha desde requerida'),
          hasta: z.string().min(1, 'Fecha hasta requerida'),
        }),
      )
      .min(1, 'Al menos un rango')
      .max(3, 'Máximo 3 rangos'),
    observaciones: z.string().optional(),
  })
  .refine(
    (d) => d.desglose.every((r) => isFutureOrToday(r.desde)),
    { message: 'Las fechas deben ser hoy o futuras', path: ['desglose'] },
  )
  .refine(
    (d) => d.desglose.every((r) => new Date(r.hasta) >= new Date(r.desde)),
    { message: 'Fecha hasta debe ser mayor o igual a desde', path: ['desglose'] },
  )
  .refine(
    (d) => d.tiempo_solicitado !== 'Completas' || d.desglose.length === 1,
    { message: 'Vacaciones completas: solo 1 rango', path: ['desglose'] },
  )
  .refine(
    (d) => {
      const sorted = [...d.desglose].sort((a, b) => a.desde.localeCompare(b.desde));
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].desde <= sorted[i - 1].hasta) return false;
      }
      return true;
    },
    { message: 'Los rangos no pueden traslaparse', path: ['desglose'] },
  );

export type VacacionesData = z.infer<typeof vacacionesSchema>;
