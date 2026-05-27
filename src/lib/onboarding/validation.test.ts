import { describe, it, expect } from 'vitest';
import {
  Step1Schema,
  Step2Schema,
  Step3Schema,
  Step4Schema,
  Step6Schema,
  Step7Schema,
  Step8Schema,
  Step9Schema,
  ErrorReportSchema,
} from './validation';

describe('wizard step schemas', () => {
  it('Step1Schema accepts 8-char alphanumeric code', () => {
    expect(Step1Schema.safeParse({ code: 'ABCD1234' }).success).toBe(true);
  });

  it('Step1Schema rejects wrong length', () => {
    expect(Step1Schema.safeParse({ code: 'ABC' }).success).toBe(false);
  });

  it('Step2Schema requires cedula', () => {
    const r = Step2Schema.safeParse({ cedula: '', employee_code: '' });
    expect(r.success).toBe(false);
  });

  it('Step3Schema accepts email', () => {
    expect(Step3Schema.safeParse({ delivery_target: 'a@b.com' }).success).toBe(true);
  });

  it('Step3Schema accepts phone +507', () => {
    expect(Step3Schema.safeParse({ delivery_target: '+50761234567' }).success).toBe(true);
  });

  it('Step4Schema enforces 10 char min', () => {
    expect(Step4Schema.safeParse({ password: '123456789' }).success).toBe(false);
    expect(Step4Schema.safeParse({ password: '1234567890' }).success).toBe(true);
  });

  it('Step6Schema requires emergency contact name + at least one phone', () => {
    expect(Step6Schema.safeParse({ contact_name: 'Maria', relationship: 'madre', phone: '+50761234567' }).success).toBe(true);
    expect(Step6Schema.safeParse({ contact_name: '', relationship: 'madre', phone: '+50761234567' }).success).toBe(false);
  });

  it('Step7Schema all fields optional but typed', () => {
    expect(Step7Schema.safeParse({}).success).toBe(true);
    expect(Step7Schema.safeParse({ blood_type: 'O+' }).success).toBe(true);
    expect(Step7Schema.safeParse({ blood_type: 'INVALID' }).success).toBe(false);
  });

  it('Step8Schema requires province', () => {
    expect(Step8Schema.safeParse({ street: 'X', province: 'Panama' }).success).toBe(true);
    expect(Step8Schema.safeParse({ street: 'X' }).success).toBe(false);
  });

  it('Step9Schema requires both acknowledgments true', () => {
    expect(Step9Schema.safeParse({ ack_ethics: true, ack_child_labor: true }).success).toBe(true);
    expect(Step9Schema.safeParse({ ack_ethics: true, ack_child_labor: false }).success).toBe(false);
  });

  it('ErrorReportSchema requires severity and description', () => {
    expect(ErrorReportSchema.safeParse({ severity: 'leve', description: 'Mi cargo está mal' }).success).toBe(true);
    expect(ErrorReportSchema.safeParse({ severity: 'invalid', description: 'X' }).success).toBe(false);
    expect(ErrorReportSchema.safeParse({ severity: 'leve', description: '' }).success).toBe(false);
  });
});
