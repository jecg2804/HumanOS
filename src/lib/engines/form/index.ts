// FormEngine (ADR-0015, ADR-0003, ADR-0002). Pure, unit-testable logic:
//   - partition a form_schema by source (profile read-only / computed badge / user_input editable)
//   - validate user_input against the schema + named business rules (dias_lte_saldo, max_repeat, required)
//   - build the submit snapshot (freeze profile + computed INTO form_data; ADR-0003)
//   - compute helpers (working_days across date ranges)
// The engine does NOT read the DB. The server action resolves profile/computed values (live hr.* reads
// pre-submit) and passes them in; the engine stays pure so it is fully testable without Supabase.

import type {
  FormSchema,
  FormField,
  ValidationResult,
  ValidationError,
  DateRange,
} from '../types';

/** Partition a schema's fields by source. */
export function partitionFields(schema: FormSchema): {
  profile: FormField[];
  computed: FormField[];
  userInput: FormField[];
} {
  return {
    profile: schema.fields.filter((f) => f.source === 'profile'),
    computed: schema.fields.filter((f) => f.source === 'computed'),
    userInput: schema.fields.filter((f) => f.source === 'user_input'),
  };
}

/** True if a value is "empty" for required-field purposes. */
function isEmpty(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

/**
 * Count business days (Mon-Fri) inclusive across a set of Del/Al ranges. Public holidays are NOT
 * subtracted here (that is policy/calendar config, A1 -- do not hardcode). Returns the total integer
 * working days; an invalid or reversed range contributes 0 and is surfaced by validate().
 */
export function workingDays(ranges: DateRange[]): number {
  let total = 0;
  for (const r of ranges) {
    if (!r?.del || !r?.al) continue;
    const start = new Date(`${r.del}T00:00:00Z`);
    const end = new Date(`${r.al}T00:00:00Z`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;
    if (end < start) continue;
    const cur = new Date(start);
    while (cur <= end) {
      const dow = cur.getUTCDay(); // 0 Sun .. 6 Sat
      if (dow !== 0 && dow !== 6) total += 1;
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
  }
  return total;
}

/** Coerce the raw date_ranges payload into a typed DateRange[] (defensive). */
export function readDateRanges(raw: unknown): DateRange[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null)
    .map((x) => ({ del: String(x.del ?? ''), al: String(x.al ?? '') }))
    .filter((r) => r.del !== '' || r.al !== '');
}

export interface ValidateContext {
  /** computed saldo (available leave balance) for the dias_lte_saldo rule. */
  leaveBalance?: number | null;
  /** computed working-days total (so validate can cross-check against the saldo). */
  diasSolicitados?: number;
}

/**
 * Validate user_input against the schema (required + max_repeat + named rules). Profile/computed
 * fields are never validated as input (they are not user-supplied). Returns all errors at once.
 */
export function validate(
  schema: FormSchema,
  userInput: Record<string, unknown>,
  ctx: ValidateContext = {}
): ValidationResult {
  const errors: ValidationError[] = [];

  for (const field of schema.fields) {
    if (field.source !== 'user_input') continue;
    const value = userInput[field.key];

    if (field.required && isEmpty(value)) {
      errors.push({ key: field.key, message: `${field.label} es obligatorio.` });
      continue;
    }

    // select / radio: value must be one of the options.
    if (
      !isEmpty(value) &&
      (field.type === 'select' || field.type === 'radio') &&
      field.options &&
      !field.options.some((o) => o.value === value)
    ) {
      errors.push({ key: field.key, message: `${field.label}: valor no permitido.` });
    }

    // date_range_group: cap rows + each range must be well-formed.
    if (field.type === 'date_range_group') {
      const ranges = readDateRanges(value);
      if (field.required && ranges.length === 0) {
        errors.push({ key: field.key, message: `${field.label}: agrega al menos un rango.` });
      }
      if (typeof field.max_repeat === 'number' && ranges.length > field.max_repeat) {
        errors.push({
          key: field.key,
          message: `${field.label}: maximo ${field.max_repeat} rangos.`,
        });
      }
      for (const r of ranges) {
        const start = new Date(`${r.del}T00:00:00Z`);
        const end = new Date(`${r.al}T00:00:00Z`);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
          errors.push({ key: field.key, message: `${field.label}: fecha invalida.` });
        } else if (end < start) {
          errors.push({ key: field.key, message: `${field.label}: "Al" no puede ser antes de "Del".` });
        }
      }
    }
  }

  // Named rule: dias_lte_saldo -- the computed dias must not exceed the computed saldo. Attached to a
  // computed field in the schema, but enforced here because it crosses computed+input boundaries.
  const hasDiasRule = schema.fields.some((f) =>
    f.validate?.some((r) => r.rule_key === 'dias_lte_saldo')
  );
  if (hasDiasRule) {
    const dias = ctx.diasSolicitados;
    const saldo = ctx.leaveBalance;
    if (typeof dias === 'number' && typeof saldo === 'number' && dias > saldo) {
      errors.push({
        key: 'dias_solicitados',
        message: `Dias solicitados (${dias}) excede el saldo disponible (${saldo}).`,
      });
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Build the submit snapshot (ADR-0003): freeze profile + computed values INTO form_data alongside the
 * user_input. Views and the PDF read this snapshot, never live hr.*. Only fields declared in the
 * schema are persisted (drops stray keys). user_input wins last in case of key overlap.
 */
export function buildSnapshot(
  schema: FormSchema,
  userInput: Record<string, unknown>,
  prefill: Record<string, unknown>
): Record<string, unknown> {
  const snapshot: Record<string, unknown> = {};
  for (const field of schema.fields) {
    if (field.source === 'profile' || field.source === 'computed') {
      if (field.key in prefill) snapshot[field.key] = prefill[field.key];
    } else {
      // user_input
      if (field.key in userInput) snapshot[field.key] = userInput[field.key];
    }
  }
  return snapshot;
}
