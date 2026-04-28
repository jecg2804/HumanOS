import { emailLayout, kvBlock } from './base';

export type SolicitudDecididaPayload = {
  to_name: string;
  request_number: string;
  request_type_label: string;
  requester_name: string;
  link: string;
};

export function renderSolicitudDecidida(p: SolicitudDecididaPayload): { subject: string; html: string } {
  return {
    subject: `Solicitud avanza para tu aprobación: ${p.request_number}`,
    html: emailLayout({
      title: 'Una solicitud avanzó y requiere tu aprobación',
      body: `<p>Hola ${p.to_name},</p>
<p>Una solicitud avanzó en su flujo de aprobación y ahora te toca a ti revisarla:</p>
${kvBlock([
  ['Solicitud', p.request_number],
  ['Tipo', p.request_type_label],
  ['Solicitante', p.requester_name],
])}`,
      ctaUrl: p.link,
      ctaLabel: 'Ver y aprobar',
    }),
  };
}
