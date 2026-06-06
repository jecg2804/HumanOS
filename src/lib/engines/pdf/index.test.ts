import { describe, it, expect } from 'vitest';
import { renderExpediente, type ExpedienteData } from './index';

const sample: ExpedienteData = {
  typeName: 'Solicitud de Vacaciones',
  ticketNumber: 'HUM-2026-0001',
  status: 'En_Revision',
  requesterName: 'Empleado Núñez', // accented -> WinAnsi
  createdAt: '5/6/2026',
  sopReference: 'IC-RH-F-05-03',
  fields: [
    { label: 'Nombre del Empleado', value: 'Empleado Núñez' },
    { label: 'Días solicitados (total)', value: '5' },
    { label: 'Desglose Del/Al', value: 'Del 2026-06-08 al 2026-06-12' },
  ],
  steps: [
    {
      label: 'Recursos Humanos (recepción / verificación)',
      decision: 'Aprobada',
      stamp: 'Recibido por Ana RRHH (RRHH), 2026-06-05 10:00:00',
      comments: null,
    },
    {
      label: 'Supervisor (Gerente de Proyecto)',
      decision: 'Pendiente',
      stamp: null,
      comments: 'pendiente',
    },
  ],
};

describe('PdfEngine.renderExpediente', () => {
  it('produces a non-empty PDF that starts with the %PDF- header', async () => {
    const bytes = await renderExpediente(sample);
    expect(bytes.length).toBeGreaterThan(500);
    const header = String.fromCharCode(...Array.from(bytes.slice(0, 5)));
    expect(header).toBe('%PDF-');
  });

  it('never throws on non-WinAnsi input (emoji / CJK / smart quotes are sanitized)', async () => {
    const data: ExpedienteData = {
      ...sample,
      requesterName: 'Test 😀 — “quotes”',
      fields: [{ label: 'X', value: '日本語 ★ — ‘ok’' }],
    };
    const bytes = await renderExpediente(data);
    expect(bytes.length).toBeGreaterThan(500);
  });

  it('handles many fields/steps without error (multi-page flow)', async () => {
    const data: ExpedienteData = {
      ...sample,
      fields: Array.from({ length: 60 }, (_, i) => ({ label: `Campo ${i}`, value: `Valor ${i}` })),
      steps: Array.from({ length: 12 }, (_, i) => ({
        label: `Paso ${i}`,
        decision: 'Aprobada',
        stamp: `Sello ${i}`,
        comments: null,
      })),
    };
    const bytes = await renderExpediente(data);
    expect(bytes.length).toBeGreaterThan(500);
  });
});
