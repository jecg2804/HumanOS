import 'server-only';
import { getResend } from './client';
import { renderSolicitudEnviada } from './templates/solicitud-enviada';
import { renderSolicitudDecidida } from './templates/solicitud-decidida';
import { renderDecisionFinal } from './templates/decision-final';

export type NotificationType = 'solicitud-enviada' | 'solicitud-decidida' | 'decision-final';

export type NotificationPayload = {
  to: string;
  to_name: string;
  request_number: string;
  request_id: string;
  request_type_label: string;
  requester_name: string;
  decision?: 'Aprobada' | 'Rechazada';
};

export type SendResult = { ok: boolean; error?: string };

export async function sendNotification(
  type: NotificationType,
  payload: NotificationPayload,
): Promise<SendResult> {
  const resend = getResend();
  if (!resend) {
    console.warn('[email] RESEND_API_KEY missing, skipping send', { type, to: payload.to });
    return { ok: false, error: 'no-api-key' };
  }

  const testMode = process.env.NOTIFICATION_TEST_EMAIL;
  const toAddress = testMode || payload.to;
  const subjectPrefix = testMode ? `[to=${payload.to}] ` : '';
  const link = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'}/solicitudes/${payload.request_id}`;

  let subject = '';
  let html = '';

  switch (type) {
    case 'solicitud-enviada': {
      const r = renderSolicitudEnviada({ ...payload, link });
      subject = r.subject;
      html = r.html;
      break;
    }
    case 'solicitud-decidida': {
      const r = renderSolicitudDecidida({ ...payload, link });
      subject = r.subject;
      html = r.html;
      break;
    }
    case 'decision-final': {
      if (!payload.decision) {
        console.error('[email] decision-final requires decision');
        return { ok: false, error: 'missing-decision' };
      }
      const r = renderDecisionFinal({ ...payload, link, decision: payload.decision });
      subject = r.subject;
      html = r.html;
      break;
    }
  }

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'HumanOS <noreply@rein-eisenwerk.com>',
    to: toAddress,
    subject: `${subjectPrefix}${subject}`,
    html,
  });

  if (error) {
    console.error('[email] resend error', error);
    return { ok: false, error: String(error) };
  }
  return { ok: true };
}
