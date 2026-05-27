import { z } from 'zod';

export const Step1Schema = z.object({
  code: z.string().length(8, 'Código debe tener 8 caracteres'),
});

export const Step2Schema = z.object({
  cedula: z.string().min(1, 'Cédula requerida'),
  employee_code: z.string().optional().or(z.literal('')),
});

const emailOrPhone = z.string().refine(
  (val) => val.includes('@') || /^\+?\d{8,15}$/.test(val.replace(/[\s-]/g, '')),
  { error: 'Ingresa un correo válido o teléfono panameño' }
);

export const Step3Schema = z.object({
  delivery_target: emailOrPhone,
});

export const Step4Schema = z.object({
  password: z.string().min(10, 'Contraseña debe tener al menos 10 caracteres'),
});

export const Step6Schema = z.object({
  contact_name: z.string().min(1, 'Nombre requerido'),
  relationship: z.string().min(1, 'Parentesco requerido'),
  phone: z.string().min(1, 'Al menos un teléfono requerido'),
  phone_alt: z.string().optional().or(z.literal('')),
});

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

export const Step7Schema = z.object({
  blood_type: z.enum(BLOOD_TYPES).optional().or(z.literal('')),
  allergies: z.string().optional().or(z.literal('')),
  chronic_conditions: z.string().optional().or(z.literal('')),
  current_medications: z.string().optional().or(z.literal('')),
  doctor_name: z.string().optional().or(z.literal('')),
  doctor_phone: z.string().optional().or(z.literal('')),
  medical_insurance_provider: z.string().optional().or(z.literal('')),
  medical_insurance_number: z.string().optional().or(z.literal('')),
  css_number: z.string().optional().or(z.literal('')),
});

export const Step8Schema = z.object({
  street: z.string().optional().or(z.literal('')),
  neighborhood: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  province: z.string().min(1, 'Provincia requerida'),
  postal_code: z.string().optional().or(z.literal('')),
});

export const Step9Schema = z.object({
  ack_ethics: z.literal(true, { error: 'Debes aceptar el manual de ética' }),
  ack_child_labor: z.literal(true, { error: 'Debes aceptar la política de trabajo infantil' }),
});

export const ErrorReportSchema = z.object({
  severity: z.enum(['leve', 'critica']),
  description: z.string().min(5, 'Describe el error con más detalle'),
});

export type Step1Input = z.infer<typeof Step1Schema>;
export type Step2Input = z.infer<typeof Step2Schema>;
export type Step3Input = z.infer<typeof Step3Schema>;
export type Step4Input = z.infer<typeof Step4Schema>;
export type Step6Input = z.infer<typeof Step6Schema>;
export type Step7Input = z.infer<typeof Step7Schema>;
export type Step8Input = z.infer<typeof Step8Schema>;
export type Step9Input = z.infer<typeof Step9Schema>;
export type ErrorReportInput = z.infer<typeof ErrorReportSchema>;
