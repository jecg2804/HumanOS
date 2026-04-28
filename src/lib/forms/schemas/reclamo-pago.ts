import { z } from 'zod';

export const RECLAMO_CATEGORIAS = [
  'Hrs. Reg. Pagadas',
  'Horas de ST. Pagadas',
  'Certificados Médicos',
  'Ausencias',
  'Feriados',
] as const;

export type ReclamoCategoria = (typeof RECLAMO_CATEGORIAS)[number];

const filaSchema = z.object({
  categoria: z.enum(RECLAMO_CATEGORIAS),
  empleado: z.number().nullable(),
  supervisor: z.number().nullable(),
  diferencia: z.number().nullable(),
});

export const reclamoPagoSchema = z
  .object({
    periodo: z.object({
      desde: z.string().min(1, 'Fecha desde requerida'),
      hasta: z.string().min(1, 'Fecha hasta requerida'),
    }),
    tabla: z.array(filaSchema).length(5, 'La tabla debe tener 5 filas'),
    descripcion: z.string().min(30, 'Describe el problema con al menos 30 caracteres'),
  })
  .refine((d) => d.periodo.hasta >= d.periodo.desde, {
    message: 'Fecha hasta debe ser ≥ desde',
    path: ['periodo'],
  })
  .refine((d) => d.tabla.some((r) => r.empleado !== null), {
    message: 'Al menos una fila debe tener un valor del empleado',
    path: ['tabla'],
  });

export type ReclamoPagoData = z.infer<typeof reclamoPagoSchema>;

export function makeEmptyReclamoTabla(): ReclamoPagoData['tabla'] {
  return RECLAMO_CATEGORIAS.map((cat) => ({
    categoria: cat,
    empleado: null,
    supervisor: null,
    diferencia: null,
  }));
}
