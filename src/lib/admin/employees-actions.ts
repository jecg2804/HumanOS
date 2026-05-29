'use server';
// ADR-0006 exception: invite code generation uses admin client for hr.invite_codes insert
// (RLS would require hr_admin context; service role bypasses for atomic creation with audit).
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { AuthorizationError, requireHrAdmin } from '@/lib/auth/require-hr-admin';
import { z } from 'zod';

type FormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  data?: unknown;
};

const EmployeeSchema = z.object({
  full_name: z.string().min(1, 'Nombre requerido'),
  national_id: z.string().min(1, 'Cédula requerida'),
  employee_code: z.string().optional().or(z.literal('')),
  position_id: z.string().uuid().optional().or(z.literal('')),
  position_text: z.string().optional().or(z.literal('')),
  department_id: z.string().uuid().optional().or(z.literal('')),
  department_text: z.string().optional().or(z.literal('')),
  office_id: z.string().uuid().optional().or(z.literal('')),
  office_text: z.string().optional().or(z.literal('')),
  supervisor_id: z.string().uuid().optional().or(z.literal('')),
  hire_date: z.string().min(1, 'Fecha de ingreso requerida'),
  app_role: z.enum(['employee', 'hr_admin', 'president', 'admin']).default('employee'),
  employment_type_id: z.string().uuid('Tipo de contrato requerido'),
  delivery_target: z.string().min(1, 'Correo o teléfono requerido'),
});

function generateInviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () =>
    alphabet[Math.floor(Math.random() * alphabet.length)]
  ).join('');
}

export async function createEmployeeAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = EmployeeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten().fieldErrors };

  if (!parsed.data.position_id && !parsed.data.position_text) {
    return { ok: false, message: 'Cargo requerido (catálogo o texto libre)' };
  }
  if (!parsed.data.department_id && !parsed.data.department_text) {
    return { ok: false, message: 'Departamento requerido' };
  }
  if (!parsed.data.office_id && !parsed.data.office_text) {
    return { ok: false, message: 'Ubicación requerida' };
  }

  // P1.6 Batch 3: require hr_admin role (was only checking auth.getUser before).
  // DB-5/audit 2026-05-29: invite_codes.generated_by FK -> hr.people(id), so use the actor's
  // person id (not the auth.users id) or the insert violates the FK.
  let actorPersonId: string;
  try {
    ({ personId: actorPersonId } = await requireHrAdmin());
  } catch (e) {
    if (e instanceof AuthorizationError) {
      return { ok: false, message: e.message };
    }
    throw e;
  }

  const admin = createSupabaseAdminClient();

  const { data: person, error: personErr } = await admin
    .schema('hr')
    .from('people')
    .insert({
      full_name: parsed.data.full_name,
      national_id: parsed.data.national_id,
      employee_code: parsed.data.employee_code || null,
      status: 'Activo',
      created_from: 'manual',
    })
    .select('id, full_name')
    .single();
  if (personErr || !person) {
    return { ok: false, message: `Insert hr.people falló: ${personErr?.message}` };
  }

  const { error: empErr } = await admin
    .schema('hr')
    .from('employments')
    .insert({
      person_id: person.id,
      position_id: parsed.data.position_id || null,
      position_text: parsed.data.position_text || null,
      department_id: parsed.data.department_id || null,
      department_text: parsed.data.department_text || null,
      office_id: parsed.data.office_id || null,
      office_text: parsed.data.office_text || null,
      supervisor_id: parsed.data.supervisor_id || null,
      hire_date: parsed.data.hire_date,
      app_role: parsed.data.app_role,
      employment_type_id: parsed.data.employment_type_id,
      created_from: 'manual',
    });
  if (empErr) return { ok: false, message: `Insert hr.employments falló: ${empErr.message}` };

  await admin.schema('hr').from('user_settings').insert({ person_id: person.id });

  const code = generateInviteCode();
  const { data: invite, error: invErr } = await admin
    .schema('hr')
    .from('invite_codes')
    .insert({
      code,
      person_id: person.id,
      generated_by: actorPersonId,
      invite_method: parsed.data.delivery_target.includes('@') ? 'email' : 'whatsapp',
      delivery_target: parsed.data.delivery_target,
    })
    .select('id, code, expires_at')
    .single();
  if (invErr || !invite) {
    return { ok: false, message: `Insert invite falló: ${invErr?.message}` };
  }

  return {
    ok: true,
    data: {
      person_id: person.id,
      invite_code: invite.code,
      expires_at: invite.expires_at,
      delivery_target: parsed.data.delivery_target,
    },
  };
}

export async function regenerateInviteCodeAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const personId = formData.get('person_id') as string | null;
  const deliveryTarget = formData.get('delivery_target') as string | null;
  if (!personId || !deliveryTarget) return { ok: false, message: 'Datos faltantes' };

  // P1.6 Batch 3: require hr_admin role.
  // DB-5/audit 2026-05-29: generated_by + audit.log.actor_id FK -> hr.people(id); use person id.
  let actorPersonId: string;
  try {
    ({ personId: actorPersonId } = await requireHrAdmin());
  } catch (e) {
    if (e instanceof AuthorizationError) {
      return { ok: false, message: e.message };
    }
    throw e;
  }

  const admin = createSupabaseAdminClient();

  await admin
    .schema('hr')
    .from('invite_codes')
    .update({ expires_at: new Date().toISOString() })
    .eq('person_id', personId)
    .is('consumed_at', null);

  const code = generateInviteCode();
  const { data: invite, error } = await admin
    .schema('hr')
    .from('invite_codes')
    .insert({
      code,
      person_id: personId,
      generated_by: actorPersonId,
      invite_method: deliveryTarget.includes('@') ? 'email' : 'whatsapp',
      delivery_target: deliveryTarget,
    })
    .select('id, code, expires_at')
    .single();
  if (error || !invite) return { ok: false, message: error?.message };

  // Audit 2026-05-29: 'action' must be in the audit.log CHECK set (insert/update/delete/restore/
  // custom/login/logout/export/view_sensitive); the semantic name goes in reason + metadata.
  // actor_id FK -> hr.people(id) so use actorPersonId (not the auth user id). Check the error so
  // a failed audit write is surfaced, not silently swallowed (it was the only audit write path).
  const { error: auditErr } = await admin.schema('audit').from('log').insert({
    actor_id: actorPersonId,
    action: 'custom',
    record_id: personId,
    schema_name: 'hr',
    table_name: 'invite_codes',
    reason: 'invite_code_regenerated',
    metadata: { semantic_action: 'invite_code_regenerated', new_code: invite.code },
  });
  if (auditErr) {
    console.error('[regenerateInvite] audit.log insert failed:', auditErr.message);
  }

  return { ok: true, data: { code: invite.code, expires_at: invite.expires_at } };
}

const UpdateEmployeeSchema = EmployeeSchema.omit({ delivery_target: true }).extend({
  person_id: z.string().uuid(),
});

export async function updateEmployeeAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = UpdateEmployeeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten().fieldErrors };

  // P1.6 Batch 3: require hr_admin role.
  let user;
  try {
    ({ user } = await requireHrAdmin());
  } catch (e) {
    if (e instanceof AuthorizationError) {
      return { ok: false, message: e.message };
    }
    throw e;
  }

  const admin = createSupabaseAdminClient();

  const { error: pErr } = await admin
    .schema('hr')
    .from('people')
    .update({
      full_name: parsed.data.full_name,
      national_id: parsed.data.national_id,
      employee_code: parsed.data.employee_code || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.person_id);
  if (pErr) return { ok: false, message: pErr.message };

  const { error: scdErr } = await admin
    .schema('hr')
    .rpc('apply_employment_scd2_change', {
      p_person_id: parsed.data.person_id,
      p_position_id: parsed.data.position_id || null,
      p_position_text: parsed.data.position_text || null,
      p_department_id: parsed.data.department_id || null,
      p_department_text: parsed.data.department_text || null,
      p_office_id: parsed.data.office_id || null,
      p_office_text: parsed.data.office_text || null,
      p_supervisor_id: parsed.data.supervisor_id || null,
      p_hire_date: parsed.data.hire_date,
      p_app_role: parsed.data.app_role,
      p_employment_type_id: parsed.data.employment_type_id,
      p_actor_id: user.id,
    });
  if (scdErr) return { ok: false, message: scdErr.message };

  return { ok: true };
}
