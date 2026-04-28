import { z } from 'zod';

export const ESTADOS_CIVILES = ['Soltero(a)', 'Casado(a)', 'Unido(a)'] as const;
export type EstadoCivil = (typeof ESTADOS_CIVILES)[number];

export const actualizacionDatosSchema = z
  .object({
    direccion: z.object({
      calle_barriada: z.string().min(3, 'Calle/barriada requerida'),
      apartamento_casa_no: z.string().optional(),
    }),
    telefono_casa: z.string().optional(),
    celular_personal: z.string().min(7, 'Celular requerido'),
    estado_civil: z.enum(ESTADOS_CIVILES),
    pareja: z
      .object({
        nombre: z.string(),
        telefono: z.string(),
      })
      .optional(),
    dependientes: z
      .array(
        z.object({
          nombre: z.string().min(1, 'Nombre requerido'),
          parentesco: z.string().min(1, 'Parentesco requerido'),
        }),
      )
      .default([]),
  })
  .refine(
    (d) =>
      !(['Casado(a)', 'Unido(a)'] as EstadoCivil[]).includes(d.estado_civil) ||
      Boolean(d.pareja && d.pareja.nombre.trim()),
    { message: 'Estado civil casado/unido requiere datos de la pareja', path: ['pareja'] },
  );

export type ActualizacionDatosData = z.infer<typeof actualizacionDatosSchema>;
