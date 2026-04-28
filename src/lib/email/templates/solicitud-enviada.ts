import { emailLayout, kvBlock } from './base';

export type SolicitudEnviadaPayload = {
  to_name: string;
  request_number: string;
  request_type_label: string;
  requester_name: string;
  link: string;
};

export function renderSolicitudEnviada(p: SolicitudEnviadaPayload): { subject: string; html: string } {
  return {
    subject: `Nueva solicitud por aprobar: ${p.request_number}`,
    html: emailLayout({
      title: 'Tienes una solicitud nueva por aprobar',
      body: `<p>Hola ${p.to_name},</p>
<p>Recibiste una nueva solicitud que requiere tu decisión:</p>
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
