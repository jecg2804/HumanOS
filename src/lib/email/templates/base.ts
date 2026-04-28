export function emailLayout({
  title,
  body,
  ctaUrl,
  ctaLabel,
}: {
  title: string;
  body: string;
  ctaUrl?: string;
  ctaLabel?: string;
}): string {
  const cta = ctaUrl
    ? `<p style="margin:16px 0 0"><a href="${ctaUrl}" style="display:inline-block;background:#1B3A5C;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:600">${ctaLabel ?? 'Ver Solicitud'}</a></p>`
    : '';
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background:#f5f5f5;color:#122740">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1B3A5C">
<tr><td style="padding:16px 24px">
<span style="color:#F5A623;font-weight:bold;font-size:18px">ICONSA</span>
<span style="color:#ffffff;font-size:14px;margin-left:8px">HumanOS</span>
</td></tr></table>
<div style="max-width:560px;margin:0 auto;padding:24px;background:#ffffff">
<h2 style="color:#1B3A5C;margin:0 0 16px;font-size:20px">${title}</h2>
${body}
${cta}
</div>
<p style="color:#5A6272;font-size:12px;text-align:center;margin:24px 0;padding:0 16px">Este es un mensaje automático del sistema HumanOS de ICONSA. No responda a este correo.</p>
</body></html>`;
}

export function kvBlock(rows: Array<[string, string]>): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="background:#F5F5F5;padding:12px;border-radius:4px;font-family:ui-monospace,'SF Mono',Menlo,monospace;font-size:13px;width:100%">
${rows
  .map(
    ([k, v]) =>
      `<tr><td style="padding:4px 8px;color:#5A6272">${k}:</td><td style="padding:4px 8px"><strong>${escapeHtml(v)}</strong></td></tr>`,
  )
  .join('')}
</table>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
