import type { RequestTypeCode } from '@/lib/approvals/chains';

export type FormHelpInfo = {
  qué_necesitas: string[];
  chain_legible: string;
};

export const FORM_HELP: Record<RequestTypeCode, FormHelpInfo> = {
  VACACIONES: {
    qué_necesitas: [
      'Las fechas de tus días de vacaciones',
      'Saber si querés pago completo, adelanto o descuento',
    ],
    chain_legible: 'Tu jefe → Rocío (RRHH) → Samantha (Gerente RRHH)',
  },
  ACCION_PERSONAL: {
    qué_necesitas: [
      'El sub-tipo de acción (aumento, hrs extras, permiso, etc.)',
      'Observaciones detalladas del caso',
    ],
    chain_legible: 'Tu jefe → Samantha → Rodrigo (Presidencia)',
  },
  PRESTAMO: {
    qué_necesitas: [
      'Monto solicitado',
      'Motivo específico (mínimo 30 caracteres)',
      'Plan de descuento por bisemana',
    ],
    chain_legible: 'Tu jefe → Milagros (Planillas) → Samantha',
  },
  ACTUALIZACION_DATOS: {
    qué_necesitas: ['Tus datos actualizados de contacto, estado civil y dependientes'],
    chain_legible: 'Rocío → Samantha',
  },
  RECLAMO_PAGO: {
    qué_necesitas: [
      'Período de pago en disputa',
      'Lo que reportaste vs lo que te pagaron por categoría',
      'Foto del comprobante de pago (opcional)',
    ],
    chain_legible: 'Milagros → Samantha',
  },
};

export const P1_CODES: RequestTypeCode[] = [
  'VACACIONES',
  'ACCION_PERSONAL',
  'PRESTAMO',
  'ACTUALIZACION_DATOS',
  'RECLAMO_PAGO',
];

export function isP1Code(code: string): code is RequestTypeCode {
  return (P1_CODES as string[]).includes(code);
}
