import { emailLayout, kvBlock } from './base';

export type DecisionFinalPayload = {
  to_name: string;
  request_number: string;
  request_type_label: string;
  requester_name: string;
  link: string;
  decision: 'Aprobada' | 'Rechazada';
};

export function renderDecisionFinal(p: DecisionFinalPayload): { subject: string; html: string } {
  const isApproved = p.decision === 'Aprobada';
  const verb = isApproved ? 'aprobada' : 'rechazada';
  return {
    subject: `Tu solicitud ${p.request_number} fue ${p.decision}`,
    html: emailLayout({
      title: `Tu solicitud fue ${p.decision}`,
      body: `<p>Hola ${p.to_name},</p>
<p>Tu solicitud ${verb} ha sido procesada por completo:</p>
${kvBlock([
  ['Solicitud', p.request_number],
  ['Tipo', p.request_type_label],
  ['Decisión', p.decision],
])}
${isApproved ? '<p>Recursos Humanos puede contactarte si hay algún paso adicional.</p>' : '<p>Si tienes preguntas sobre la decisión, contacta a Recursos Humanos.</p>'}`,
      ctaUrl: p.link,
      ctaLabel: 'Ver Detalle',
    }),
  };
}
