'use server';
// SEC-ROLE-RPC (migration 076 / ADR-0001): the LOGGED-IN hr_admin paths (regenerate invite, update
// person profile) call SECURITY DEFINER RPCs via the SESSION client (authenticated) -- the RPC's
// internal is_hr_admin() guard authorizes and the privileged write runs as owner. createEmployee +
// the employment SCD-2 change still use service_role to call their own definer RPCs (not direct DML).
import { randomInt } from 'node:crypto';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
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
  // Invite code is the load-bearing bootstrap secret (signup-advisory 2026-06-01):
  // generate with a CSPRNG, NOT Math.random() (which is predictable). The 32-char
  // alphabet maps cleanly to randomInt's unbiased range. 8 chars over 32 symbols = 40 bits.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => alphabet[randomInt(alphabet.length)]).join('');
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
  const code = generateInviteCode();

  // CODE-ADMIN-TX: one atomic SECURITY DEFINER RPC (migration 068/070/071) instead of 4 separate
  // non-transactional PostgREST writes. A partial failure used to leave a corrupted record (orphan
  // person, person without invite, or a silently-failed user_settings insert); now it is
  // all-or-nothing. hr.user_settings is created by the AFTER INSERT trigger on hr.people, so it is
  // NOT passed here. Empty optional fields are sent as undefined (RPC param defaults to NULL).
  const { data: created, error } = await admin
    .schema('hr')
    .rpc('create_employee_with_invite', {
      p_full_name: parsed.data.full_name,
      p_national_id: parsed.data.national_id,
      p_employee_code: parsed.data.employee_code || undefined,
      p_position_id: parsed.data.position_id || undefined,
      p_position_text: parsed.data.position_text || undefined,
      p_department_id: parsed.data.department_id || undefined,
      p_department_text: parsed.data.department_text || undefined,
      p_office_id: parsed.data.office_id || undefined,
      p_office_text: parsed.data.office_text || undefined,
      p_supervisor_id: parsed.data.supervisor_id || undefined,
      p_hire_date: parsed.data.hire_date,
      p_app_role: parsed.data.app_role,
      p_employment_type_id: parsed.data.employment_type_id,
      p_actor_id: actorPersonId,
      p_invite_code: code,
      p_invite_method: parsed.data.delivery_target.includes('@') ? 'email' : 'whatsapp',
      p_delivery_target: parsed.data.delivery_target,
    })
    .single();

  if (error || !created) {
    return {
      ok: false,
      message: `No se pudo crear el empleado: ${error?.message ?? 'error desconocido'}`,
    };
  }

  return {
    ok: true,
    data: {
      person_id: created.new_person_id,
      invite_code: created.new_invite_code,
      expires_at: created.new_expires_at,
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

  // P1.6 Batch 3: require hr_admin role (friendly error early + defense-in-depth; the RPC re-checks).
  try {
    await requireHrAdmin();
  } catch (e) {
    if (e instanceof AuthorizationError) {
      return { ok: false, message: e.message };
    }
    throw e;
  }

  const code = generateInviteCode();
  const supabase = await createSupabaseServerClient();

  // SEC-ROLE-RPC (076): one SECURITY DEFINER RPC, called via the session client, does it all
  // atomically as owner — expire prior unconsumed codes (F-11), insert the new one (generated_by =
  // current_person_id() resolved inside the RPC), and write the audit entry. Its internal
  // is_hr_admin() guard authorizes. Replaces the prior direct service_role writes to invite_codes +
  // audit.log; the audit write is now in the same transaction (no more swallowed-failure path).
  const { data: invite, error } = await supabase
    .schema('hr')
    .rpc('regenerate_invite_code', {
      p_person_id: personId,
      p_code: code,
      p_invite_method: deliveryTarget.includes('@') ? 'email' : 'whatsapp',
      p_delivery_target: deliveryTarget,
    })
    .single();
  if (error || !invite) {
    return { ok: false, message: error?.message ?? 'No se pudo regenerar el código.' };
  }

  return { ok: true, data: { code: invite.out_code, expires_at: invite.out_expires_at } };
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

  // SEC-ROLE-RPC (076): people-write via SECURITY DEFINER RPC. hr.people stays SELECT-only for
  // authenticated (069); the RPC does the write as owner after its internal is_hr_admin() guard.
  const supabase = await createSupabaseServerClient();
  const { error: pErr } = await supabase
    .schema('hr')
    .rpc('update_person_profile', {
      p_person_id: parsed.data.person_id,
      p_full_name: parsed.data.full_name,
      p_national_id: parsed.data.national_id,
      p_employee_code: parsed.data.employee_code || undefined,
    });
  if (pErr) return { ok: false, message: pErr.message };

  // Employment changes stay on apply_employment_scd2_change: it is EXECUTE service_role-only, and
  // calling a definer RPC via service_role is a definer-RPC call (not direct DML) — ADR-0001-fine,
  // unaffected by 076.
  const admin = createSupabaseAdminClient();

  const { error: scdErr } = await admin
    .schema('hr')
    .rpc('apply_employment_scd2_change', {
      p_person_id: parsed.data.person_id,
      p_position_id: parsed.data.position_id || undefined,
      p_position_text: parsed.data.position_text || undefined,
      p_department_id: parsed.data.department_id || undefined,
      p_department_text: parsed.data.department_text || undefined,
      p_office_id: parsed.data.office_id || undefined,
      p_office_text: parsed.data.office_text || undefined,
      p_supervisor_id: parsed.data.supervisor_id || undefined,
      p_hire_date: parsed.data.hire_date,
      p_app_role: parsed.data.app_role,
      p_employment_type_id: parsed.data.employment_type_id,
      p_actor_id: user.id,
    });
  if (scdErr) return { ok: false, message: scdErr.message };

  return { ok: true };
}
