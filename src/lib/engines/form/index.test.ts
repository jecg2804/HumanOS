import { describe, it, expect } from 'vitest';
import {
  partitionFields,
  workingDays,
  readDateRanges,
  validate,
  buildSnapshot,
} from './index';
import type { FormSchema } from '../types';

// VACACIONES-shaped schema (mirrors migration 094 §8 seed).
const schema: FormSchema = {
  version: 1,
  fields: [
    { key: 'fecha_solicitud', label: 'Fecha', source: 'computed', type: 'date', compute_fn: 'now_date' },
    { key: 'nombre_empleado', label: 'Nombre', source: 'profile', type: 'text', path: 'people.full_name' },
    { key: 'cedula', label: 'Cedula', source: 'profile', type: 'text', path: 'people.national_id' },
    { key: 'saldo_vacaciones', label: 'Saldo', source: 'computed', type: 'computed', compute_fn: 'leave_balance' },
    {
      key: 'dias_solicitados', label: 'Dias', source: 'computed', type: 'computed',
      compute_fn: 'working_days', validate: [{ rule_key: 'dias_lte_saldo' }],
    },
    {
      key: 'tipo_pago', label: 'Tipo de Pago', source: 'user_input', type: 'select', required: true,
      options: [
        { value: 'completas', label: 'Completas' },
        { value: 'adelanto', label: 'Adelanto' },
        { value: 'descuento', label: 'Descuento' },
      ],
    },
    {
      key: 'date_ranges', label: 'Desglose', source: 'user_input', type: 'date_range_group',
      group: 'date_ranges', max_repeat: 3, required: true,
    },
    { key: 'observaciones', label: 'Observaciones', source: 'user_input', type: 'textarea', required: false },
  ],
};

describe('FormEngine.partitionFields', () => {
  it('splits fields by source (profile / computed / user_input)', () => {
    const p = partitionFields(schema);
    expect(p.profile.map((f) => f.key)).toEqual(['nombre_empleado', 'cedula']);
    expect(p.computed.map((f) => f.key)).toEqual(['fecha_solicitud', 'saldo_vacaciones', 'dias_solicitados']);
    expect(p.userInput.map((f) => f.key)).toEqual(['tipo_pago', 'date_ranges', 'observaciones']);
  });
});

describe('FormEngine.workingDays', () => {
  it('counts business days inclusive (Mon-Fri)', () => {
    // 2026-06-08 (Mon) .. 2026-06-12 (Fri) = 5 working days.
    expect(workingDays([{ del: '2026-06-08', al: '2026-06-12' }])).toBe(5);
  });

  it('excludes weekends', () => {
    // 2026-06-05 (Fri) .. 2026-06-08 (Mon) = Fri + Mon = 2 (Sat/Sun excluded).
    expect(workingDays([{ del: '2026-06-05', al: '2026-06-08' }])).toBe(2);
  });

  it('sums across multiple ranges', () => {
    expect(
      workingDays([
        { del: '2026-06-08', al: '2026-06-09' }, // Mon-Tue = 2
        { del: '2026-06-15', al: '2026-06-15' }, // Mon = 1
      ])
    ).toBe(3);
  });

  it('ignores reversed or invalid ranges', () => {
    expect(workingDays([{ del: '2026-06-12', al: '2026-06-08' }])).toBe(0);
    expect(workingDays([{ del: 'nope', al: 'nope' }])).toBe(0);
  });
});

describe('FormEngine.readDateRanges', () => {
  it('coerces arbitrary payloads into typed ranges, dropping empties', () => {
    expect(readDateRanges([{ del: '2026-06-08', al: '2026-06-09' }, { del: '', al: '' }])).toEqual([
      { del: '2026-06-08', al: '2026-06-09' },
    ]);
    expect(readDateRanges(null)).toEqual([]);
    expect(readDateRanges('x')).toEqual([]);
  });
});

describe('FormEngine.validate', () => {
  const goodInput = {
    tipo_pago: 'completas',
    date_ranges: [{ del: '2026-06-08', al: '2026-06-12' }],
    observaciones: '',
  };

  it('passes a valid VACACIONES input within saldo', () => {
    const r = validate(schema, goodInput, { leaveBalance: 10, diasSolicitados: 5 });
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('rejects dias > saldo (dias_lte_saldo, R9)', () => {
    const r = validate(schema, goodInput, { leaveBalance: 3, diasSolicitados: 5 });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.key === 'dias_solicitados')).toBe(true);
  });

  it('rejects a missing required user_input field', () => {
    const r = validate(schema, { ...goodInput, tipo_pago: '' }, { leaveBalance: 10, diasSolicitados: 5 });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.key === 'tipo_pago')).toBe(true);
  });

  it('rejects a select value not in options', () => {
    const r = validate(schema, { ...goodInput, tipo_pago: 'otro' }, { leaveBalance: 10, diasSolicitados: 5 });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.key === 'tipo_pago')).toBe(true);
  });

  it('caps the date_range_group at max_repeat (3)', () => {
    const r = validate(
      schema,
      {
        ...goodInput,
        date_ranges: [
          { del: '2026-06-08', al: '2026-06-08' },
          { del: '2026-06-09', al: '2026-06-09' },
          { del: '2026-06-10', al: '2026-06-10' },
          { del: '2026-06-11', al: '2026-06-11' },
        ],
      },
      { leaveBalance: 10, diasSolicitados: 4 }
    );
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.key === 'date_ranges' && /maximo 3/.test(e.message))).toBe(true);
  });

  it('rejects a reversed range (Al before Del)', () => {
    const r = validate(
      schema,
      { ...goodInput, date_ranges: [{ del: '2026-06-12', al: '2026-06-08' }] },
      { leaveBalance: 10, diasSolicitados: 0 }
    );
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.key === 'date_ranges')).toBe(true);
  });
});

describe('FormEngine.buildSnapshot (ADR-0003)', () => {
  it('freezes profile + computed alongside user_input, dropping stray keys', () => {
    const prefill = {
      fecha_solicitud: '2026-06-05',
      nombre_empleado: 'Juan Perez',
      cedula: '8-930-2166',
      saldo_vacaciones: 12,
      dias_solicitados: 5,
      ignored_profile_key: 'x',
    };
    const userInput = {
      tipo_pago: 'completas',
      date_ranges: [{ del: '2026-06-08', al: '2026-06-12' }],
      observaciones: 'viaje',
      stray: 'drop me',
    };
    const snap = buildSnapshot(schema, userInput, prefill);
    expect(snap).toEqual({
      fecha_solicitud: '2026-06-05',
      nombre_empleado: 'Juan Perez',
      cedula: '8-930-2166',
      saldo_vacaciones: 12,
      dias_solicitados: 5,
      tipo_pago: 'completas',
      date_ranges: [{ del: '2026-06-08', al: '2026-06-12' }],
      observaciones: 'viaje',
    });
    // stray keys not declared in the schema are excluded.
    expect(snap).not.toHaveProperty('stray');
    expect(snap).not.toHaveProperty('ignored_profile_key');
  });
});
