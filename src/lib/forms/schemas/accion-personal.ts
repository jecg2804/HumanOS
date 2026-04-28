import { z } from 'zod';

export const ACCION_SUB_TIPOS = [
  'Aumento de Salario',
  'Autorización de Horas Extras',
  'Permisos',
  'Descuento',
  'Despido',
  'Orden de Liquidación',
] as const;

export type AccionSubTipo = (typeof ACCION_SUB_TIPOS)[number];

export const accionPersonalSchema = z.object({
  sub_tipo: z.enum(ACCION_SUB_TIPOS),
  empleado_objeto_id: z.string().uuid('ID de empleado inválido'),
  observaciones: z.string().min(10, 'Observaciones requeridas (mínimo 10 caracteres)'),
});

export type AccionPersonalData = z.infer<typeof accionPersonalSchema>;
