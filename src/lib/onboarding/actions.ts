'use server';
// ADR-0006 exception: this module uses service_role admin client for multi-app
// provisioning during onboarding. See docs/adr/0006-service-role-admin-client-onboarding-exception.md

import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  Step1Schema,
  Step2Schema,
  Step3Schema,
  ErrorReportSchema,
} from './validation';
import { normalizeNationalId, normalizePhone } from './normalize';
import { signOnboardingToken, verifyOnboardingToken } from './token';
import { translateAuthError } from '@/lib/auth/errors';
import { NotificationType } from '@/lib/notifications/types';
import { enqueueNotification } from '@/lib/notifications/insert';

type FormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  data?: unknown;
};

export async function validateInviteCodeAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const input = Object.fromEntries(formData) as Record<string, string>;
  const codeR = Step1Schema.safeParse({ code: input.code });
  const cedR = Step2Schema.safeParse({ cedula: input.cedula, employee_code: input.employee_code });
  const delR = Step3Schema.safeParse({ delivery_target: input.delivery_target });
  if (!codeR.success || !cedR.success || !delR.success) {
    return {
      ok: false,
      errors: {
        ...(codeR.success ? {} : codeR.error.flatten().fieldErrors),
        ...(cedR.success ? {} : cedR.error.flatten().fieldErrors),
        ...(delR.success ? {} : delR.error.flatten().fieldErrors),
      },
    };
  }

  const admin = createSupabaseAdminClient();

  // Extract requester IP for rate-limit (NEW.A Batch 3)
  const headersList = await headers();
  const forwardedFor = headersList.get('x-forwarded-for');
  const realIp = headersList.get('x-real-ip');
  const ipAddress = (forwardedFor?.split(',')[0]?.trim() || realIp || '0.0.0.0').slice(0, 45);

  const { data: invite } = await admin
    .schema('hr')
    .from('invite_codes')
    .select('id, code, person_id, expires_at, consumed_at, validated_at, validated_delivery_target_hash')
    .eq('code', codeR.data.code)
    .maybeSingle();

  if (!invite) {
    return { ok: false, message: 'Código de invitación no encontrado.' };
  }
  if (invite.consumed_at) {
    return { ok: false, message: 'Este código ya fue usado.' };
  }
  if (new Date(invite.expires_at) < new Date()) {
    return { ok: false, message: 'Código expirado. Solicita uno nuevo a RRHH.' };
  }

  // NEW.A Batch 3: rate-limit AFTER invite found (real invite_code_id) but BEFORE
  // person/cedula reveal. Attribute attempts to the real invite.
  const { data: rateLimitJson, error: rateErr } = await admin
    .schema('hr')
    .rpc('check_invite_code_rate_limit', {
      p_invite_code_id: invite.id,
      p_ip_address: ipAddress,
    });

  if (rateErr) {
    // Fail closed
    return { ok: false, message: 'Error de validación. Intenta de nuevo.' };
  }
  const rateLimit = rateLimitJson as { blocked: boolean; attempts_remaining: number } | null;
  if (rateLimit?.blocked) {
    return {
      ok: false,
      message: 'Demasiados intentos. Espera unos minutos antes de reintentar.',
    };
  }

  const { data: person } = await admin
    .schema('hr')
    .from('people')
    .select('id, national_id, employee_code, full_name')
    .eq('id', invite.person_id)
    .maybeSingle();

  if (!person) {
    return { ok: false, message: 'Empleado no encontrado en el sistema.' };
  }

  const formCed = normalizeNationalId(cedR.data.cedula);
  const dbCed = normalizeNationalId(person.national_id ?? '');
  if (formCed !== dbCed) {
    return { ok: false, message: 'Cédula no coincide con la registrada.' };
  }
  if (
    cedR.data.employee_code &&
    person.employee_code &&
    cedR.data.employee_code.trim().toUpperCase() !== person.employee_code.trim().toUpperCase()
  ) {
    return { ok: false, message: 'Código de empleado no coincide.' };
  }

  const isEmail = delR.data.delivery_target.includes('@');
  const normalizedTarget = isEmail
    ? delR.data.delivery_target.trim().toLowerCase()
    : normalizePhone(delR.data.delivery_target);
  const field = isEmail ? 'email' : 'phone';

  // NEW.A Batch 3: commitment hash. SHA256 hex del normalized delivery_target.
  // First successful (code+cedula gates passed) attempt commits the hash; subsequent
  // attempts with different hash are rejected (kills cross-app enumeration oracle).
  const deliveryTargetHash = createHash('sha256').update(normalizedTarget).digest('hex');

  let committedValidatedAt = invite.validated_at;

  if (invite.validated_at) {
    if (invite.validated_delivery_target_hash !== deliveryTargetHash) {
      return {
        ok: false,
        message:
          'Esta invitación ya fue iniciada con otro correo o teléfono. Si te equivocaste, contacta a RRHH para regenerar la invitación.',
      };
    }
    // Same hash: user retrying with same delivery_target. Allow continue.
  } else {
    // Atomic compare-and-swap via WHERE validated_at IS NULL guard.
    const { data: updateResult } = await admin
      .schema('hr')
      .from('invite_codes')
      .update({
        validated_at: new Date().toISOString(),
        validated_delivery_target_hash: deliveryTargetHash,
      })
      .eq('id', invite.id)
      .is('validated_at', null)
      .select('validated_at, validated_delivery_target_hash')
      .maybeSingle();

    if (updateResult) {
      committedValidatedAt = updateResult.validated_at;
    } else {
      // Lost the race: someone else committed first. Re-read and check hash.
      const { data: fresh } = await admin
        .schema('hr')
        .from('invite_codes')
        .select('validated_at, validated_delivery_target_hash')
        .eq('id', invite.id)
        .maybeSingle();
      if (fresh?.validated_delivery_target_hash !== deliveryTargetHash) {
        return {
          ok: false,
          message:
            'Esta invitación ya fue iniciada con otro correo o teléfono. Si te equivocaste, contacta a RRHH para regenerar la invitación.',
        };
      }
      committedValidatedAt = fresh?.validated_at ?? committedValidatedAt;
    }
  }

  const { data: employmentRaw } = await admin
    .schema('hr')
    .from('employments')
    .select(
      `hire_date,
       position_text,
       department_text,
       office_text,
       position:positions(title),
       department:org_units(name),
       office:locations(name),
       supervisor:people!supervisor_id(full_name),
       employment_type:employment_types(short_name)`
    )
    .eq('person_id', invite.person_id)
    .eq('is_current', true)
    .maybeSingle();

  const employment = employmentRaw as unknown as {
    hire_date: string | null;
    position_text: string | null;
    department_text: string | null;
    office_text: string | null;
    position: { title: string } | null;
    department: { name: string } | null;
    office: { name: string } | null;
    supervisor: { full_name: string } | null;
    employment_type: { short_name: string } | null;
  } | null;

  const preview = {
    full_name: person.full_name,
    position: employment?.position?.title ?? employment?.position_text ?? 'Sin asignar',
    department: employment?.department?.name ?? employment?.department_text ?? 'Sin asignar',
    supervisor_name: employment?.supervisor?.full_name ?? null,
    office: employment?.office?.name ?? employment?.office_text ?? 'Sin asignar',
    hire_date: employment?.hire_date ?? 'Sin asignar',
    employment_type: employment?.employment_type?.short_name ?? 'Sin asignar',
  };

  // NEW.A Batch 3: HMAC token bound to (invite, person, validated_at) for
  // reportOnboardingErrorAction validation (kills person_id spoofing NEW.B).
  const token = signOnboardingToken({
    invite_id: invite.id,
    person_id: person.id,
    validated_at: committedValidatedAt ?? new Date().toISOString(),
  });

  return {
    ok: true,
    data: {
      person_id: person.id,
      display_name: person.full_name,
      invite_id: invite.id,
      // NEW.A: existing_multi_app_user + existing_email_masked REMOVED. Multi-app
      // detection moves silently into completeOnboardingAction (no client leak).
      normalized_target: normalizedTarget,
      target_field: field,
      preview,
      token,
    },
  };
}

export async function reportOnboardingErrorAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = ErrorReportSchema.safeParse({
    severity: formData.get('severity'),
    description: formData.get('description'),
  });
  const personId = formData.get('person_id') as string;
  const token = formData.get('token') as string | null;
  if (!parsed.success || !personId) {
    return {
      ok: false,
      errors: parsed.success ? {} : parsed.error.flatten().fieldErrors,
    };
  }

  // NEW.B Batch 3: validate HMAC token from wizard session. Kills person_id
  // spoofing vandalism vector (anyone with valid invite+cedula could
  // pollute another person's review_notes + spam hr_admin).
  if (!token) {
    return { ok: false, message: 'Sesión inválida. Reinicia el onboarding.' };
  }
  const payload = verifyOnboardingToken(token);
  if (!payload || payload.person_id !== personId) {
    return { ok: false, message: 'Sesión inválida. Reinicia el onboarding.' };
  }

  const admin = createSupabaseAdminClient();

  const { data: person } = await admin
    .schema('hr')
    .from('people')
    .select('id, full_name, review_notes')
    .eq('id', personId)
    .maybeSingle();
  if (!person) return { ok: false, message: 'Empleado no encontrado.' };

  const stamp = new Date().toISOString();
  const newEntry = `**[${stamp}] Onboarding step 5 — Severidad: ${parsed.data.severity}**\n${parsed.data.description}`;
  const updated = person.review_notes ? `${person.review_notes}\n\n---\n\n${newEntry}` : newEntry;

  await admin
    .schema('hr')
    .from('people')
    .update({ needs_review: true, review_notes: updated })
    .eq('id', personId);

  const { data: hrAdmins } = await admin
    .schema('hr')
    .from('employments')
    .select('person_id')
    .eq('app_role', 'hr_admin')
    .eq('is_current', true);

  for (const row of hrAdmins ?? []) {
    await enqueueNotification(admin, {
      recipientPersonId: row.person_id,
      type: NotificationType.OnboardingErrorReported,
      subject: `Error reportado por ${person.full_name}`,
      body: `Severidad: ${parsed.data.severity}. ${parsed.data.description.slice(0, 200)}`,
      templateVariables: {
        employee_name: person.full_name,
        severity: parsed.data.severity,
        description: parsed.data.description,
        reported_at: stamp,
      },
      metadata: {
        person_id: personId,
        deep_link: `/admin/empleados/${personId}/editar`,
        severity: parsed.data.severity,
        context: 'onboarding_step_5',
      },
    });
  }

  return {
    ok: true,
    data: {
      severity: parsed.data.severity,
      should_pause_wizard: parsed.data.severity === 'critica',
    },
  };
}

export interface CompleteOnboardingInput {
  invite_id: string;
  person_id: string;
  target_field: 'email' | 'phone';
  normalized_target: string;
  password: string | null;
  emergency: {
    contact_name: string;
    relationship: string;
    phone: string;
    phone_alt?: string;
  };
  medical: Record<string, string>;
  address: {
    street?: string;
    neighborhood?: string;
    city?: string;
    province: string;
    postal_code?: string;
  };
  ack_ethics_at: string;
  ack_child_labor_at: string;
  photo_path: string | null;
}

export async function completeOnboardingAction(
  input: CompleteOnboardingInput & { ip_address?: string; user_agent?: string }
): Promise<FormState> {
  const admin = createSupabaseAdminClient();

  let authId: string;
  let originalAppMetadata: Record<string, unknown> | null = null;
  const { data: existingRows } = await admin.schema('hr').rpc('find_auth_user_by_identifier', {
    p_field: input.target_field,
    p_value: input.normalized_target,
  });
  const existing = (existingRows as unknown as Array<{
    id: string;
    raw_app_meta_data: Record<string, unknown>;
  }> | null)?.[0];

  if (existing) {
    originalAppMetadata = { ...existing.raw_app_meta_data };
    const currentApps =
      (existing.raw_app_meta_data as { allowed_apps?: string[] })?.allowed_apps ?? [];
    if (!currentApps.includes('humanOS')) {
      const newApps = Array.from(new Set([...currentApps, 'humanOS']));
      const { error } = await admin.auth.admin.updateUserById(existing.id, {
        app_metadata: {
          ...existing.raw_app_meta_data,
          allowed_apps: newApps,
        },
      });
      if (error) {
        return { ok: false, message: translateAuthError(error) };
      }
    }
    authId = existing.id;
  } else {
    if (!input.password) {
      return { ok: false, message: 'Password requerido para crear nueva cuenta.' };
    }
    const { data: newUser, error } = await admin.auth.admin.createUser({
      [input.target_field]: input.normalized_target,
      password: input.password,
      email_confirm: input.target_field === 'email',
      app_metadata: { allowed_apps: ['humanOS'] },
    });
    if (error || !newUser?.user) {
      return {
        ok: false,
        message: translateAuthError(
          error ?? { code: 'unknown', message: 'createUser failed' }
        ),
      };
    }
    authId = newUser.user.id;
  }

  const { error: rpcErr } = await admin.schema('hr').rpc('complete_onboarding_writes', {
    p_invite_id: input.invite_id,
    p_person_id: input.person_id,
    p_auth_id: authId,
    p_photo_path: input.photo_path,
    p_emergency: input.emergency,
    p_medical: input.medical,
    p_address: input.address,
    p_ack_ethics_at: input.ack_ethics_at,
    p_ack_child_labor_at: input.ack_child_labor_at,
    p_ip_address: input.ip_address ?? null,
    p_user_agent: input.user_agent ?? null,
  });

  if (rpcErr) {
    if (!existing) {
      await admin.auth.admin.deleteUser(authId);
    } else if (originalAppMetadata) {
      await admin.auth.admin.updateUserById(authId, {
        app_metadata: originalAppMetadata,
      });
    }
    return { ok: false, message: `Onboarding falló: ${rpcErr.message}` };
  }

  const { data: person } = await admin
    .schema('hr')
    .from('people')
    .select('full_name')
    .eq('id', input.person_id)
    .maybeSingle();

  await enqueueNotification(admin, {
    recipientPersonId: input.person_id,
    type: NotificationType.WelcomeEmployee,
    subject: 'Bienvenido a HumanOS',
    body: `Tu cuenta está lista, ${person?.full_name ?? ''}.`,
    templateVariables: {
      employee_name: person?.full_name ?? '',
      perfil_url: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/perfil`,
    },
    metadata: { person_id: input.person_id, deep_link: '/perfil' },
  });

  return { ok: true, data: { auth_id: authId, redirect_to: '/perfil' } };
}

export async function redirectToPerfilAction(): Promise<never> {
  redirect('/perfil');
}

export async function uploadOnboardingAvatarAction(formData: FormData): Promise<{
  ok: boolean;
  path?: string;
  error?: string;
}> {
  const inviteId = formData.get('invite_id') as string | null;
  const personId = formData.get('person_id') as string | null;
  const file = formData.get('photo') as File | null;
  if (!inviteId || !personId || !file) {
    return { ok: false, error: 'Datos faltantes para subir foto' };
  }

  const admin = createSupabaseAdminClient();

  const { data: invite } = await admin
    .schema('hr')
    .from('invite_codes')
    .select('id, person_id, consumed_at, expires_at')
    .eq('id', inviteId)
    .maybeSingle();

  if (!invite || invite.person_id !== personId) {
    return { ok: false, error: 'Invitación no válida para este empleado' };
  }
  if (invite.consumed_at) {
    return { ok: false, error: 'Invitación ya consumida' };
  }
  if (new Date(invite.expires_at) < new Date()) {
    return { ok: false, error: 'Invitación expirada' };
  }

  const mimeToExt: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  const ext = mimeToExt[file.type];
  if (!ext) {
    return { ok: false, error: 'Formato no soportado. Usa JPG, PNG o WebP.' };
  }

  const path = `${personId}/current.${ext}`;
  const buffer = await file.arrayBuffer();
  const { error: uploadErr } = await admin.storage
    .from('avatars')
    .upload(path, new Uint8Array(buffer), {
      contentType: file.type,
      upsert: true,
    });

  if (uploadErr) {
    return { ok: false, error: `Upload falló: ${uploadErr.message}` };
  }

  return { ok: true, path: `avatars/${path}` };
}
