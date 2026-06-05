'use client';
// Generic FormEngine renderer (ADR-0015): renders ANY requests.types.form_schema by field `source`,
// with zero per-form logic. The three sources map to the mental model (CLAUDE.md):
//   - profile     -> already in BD; prefilled, READ-ONLY, muted, "(de tu perfil)" hint. Never asked.
//   - computed    -> system-derived; READ-ONLY with a gold "Calculado" badge.
//   - user_input  -> the ONLY editable fields (text/textarea/select/date_range_group).
// Controlled component: the user_input values live in the parent; this renders + reports changes.

import { useId } from 'react';
import type { FormSchema, FormField, FieldOption, DateRange } from '@/lib/engines/types';

export interface FormFieldsRendererProps {
  schema: FormSchema;
  /** profile + computed values resolved server-side (read-only display). */
  prefill: Record<string, unknown>;
  /** user_input values (controlled by the parent). */
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  /** per-field error messages (keyed by field.key). */
  errors?: Record<string, string>;
  disabled?: boolean;
}

function displayValue(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'number') return String(v);
  return String(v);
}

export function FormFieldsRenderer({
  schema,
  prefill,
  values,
  onChange,
  errors = {},
  disabled = false,
}: FormFieldsRendererProps) {
  return (
    <div className="space-y-4">
      {schema.fields.map((field) => (
        <FieldRow
          key={field.key}
          field={field}
          prefill={prefill}
          value={values[field.key]}
          onChange={(v) => onChange(field.key, v)}
          error={errors[field.key]}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

function FieldRow({
  field,
  prefill,
  value,
  onChange,
  error,
  disabled,
}: {
  field: FormField;
  prefill: Record<string, unknown>;
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
  disabled: boolean;
}) {
  const id = useId();

  // ---- profile / computed: read-only, never asked ----
  if (field.source === 'profile' || field.source === 'computed') {
    return (
      <div>
        <div className="flex items-center gap-2 mb-1">
          <label htmlFor={id} className="block text-sm font-medium text-gray-700">
            {field.label}
          </label>
          {field.source === 'computed' ? (
            <span className="text-[10px] uppercase tracking-wide font-semibold text-gold-700 bg-gold-50 border border-gold-200 rounded px-1.5 py-0.5">
              Calculado
            </span>
          ) : (
            <span className="text-xs text-gray-400">(de tu perfil)</span>
          )}
        </div>
        <output
          id={id}
          className="block w-full p-3 border rounded bg-gray-50 text-gray-600"
        >
          {displayValue(prefill[field.key])}
        </output>
      </div>
    );
  }

  // ---- user_input: the only editable fields ----
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium mb-1">
        {field.label}
        {field.required && <span className="text-red-600"> *</span>}
      </label>
      <UserInput
        id={id}
        field={field}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
      {error && (
        <p role="alert" className="text-sm text-red-600 mt-1">
          {error}
        </p>
      )}
    </div>
  );
}

function UserInput({
  id,
  field,
  value,
  onChange,
  disabled,
}: {
  id: string;
  field: FormField;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled: boolean;
}) {
  const cls = 'w-full p-3 border rounded disabled:opacity-50';

  switch (field.type) {
    case 'textarea':
      return (
        <textarea
          id={id}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          disabled={disabled}
          className={cls}
        />
      );

    case 'select':
    case 'radio':
      return (
        <select
          id={id}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={cls}
        >
          <option value="">Selecciona…</option>
          {(field.options ?? []).map((o: FieldOption) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );

    case 'date_range_group':
      return (
        <DateRangeGroup
          value={value}
          onChange={onChange}
          maxRepeat={field.max_repeat ?? 3}
          disabled={disabled}
        />
      );

    case 'number':
    case 'currency':
      return (
        <input
          id={id}
          type="number"
          value={(value as number | string) ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          disabled={disabled}
          className={cls}
        />
      );

    case 'date':
    case 'datetime':
    case 'time':
      return (
        <input
          id={id}
          type={field.type === 'datetime' ? 'datetime-local' : field.type}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={cls}
        />
      );

    default:
      return (
        <input
          id={id}
          type="text"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={cls}
        />
      );
  }
}

/** Repeatable Del/Al rows (VACACIONES desglose; capped at max_repeat). */
function DateRangeGroup({
  value,
  onChange,
  maxRepeat,
  disabled,
}: {
  value: unknown;
  onChange: (v: DateRange[]) => void;
  maxRepeat: number;
  disabled: boolean;
}) {
  const rows: DateRange[] =
    Array.isArray(value) && value.length > 0
      ? (value as DateRange[])
      : [{ del: '', al: '' }];

  const update = (i: number, patch: Partial<DateRange>) => {
    const next = rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
    onChange(next);
  };
  const add = () => onChange([...rows, { del: '', al: '' }]);
  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="flex items-end gap-2">
          <div className="flex-1">
            <span className="block text-xs text-gray-500 mb-1">Del</span>
            <input
              type="date"
              value={r.del}
              onChange={(e) => update(i, { del: e.target.value })}
              disabled={disabled}
              className="w-full p-2 border rounded"
              aria-label={`Desde (rango ${i + 1})`}
            />
          </div>
          <div className="flex-1">
            <span className="block text-xs text-gray-500 mb-1">Al</span>
            <input
              type="date"
              value={r.al}
              onChange={(e) => update(i, { al: e.target.value })}
              disabled={disabled}
              className="w-full p-2 border rounded"
              aria-label={`Hasta (rango ${i + 1})`}
            />
          </div>
          {rows.length > 1 && (
            <button
              type="button"
              onClick={() => remove(i)}
              disabled={disabled}
              className="text-sm text-red-600 px-2 py-2"
              aria-label={`Quitar rango ${i + 1}`}
            >
              Quitar
            </button>
          )}
        </div>
      ))}
      {rows.length < maxRepeat && (
        <button
          type="button"
          onClick={add}
          disabled={disabled}
          className="text-sm text-navy-500 font-medium"
        >
          + Agregar rango
        </button>
      )}
    </div>
  );
}
