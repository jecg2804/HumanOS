# Manual entry F32 bypasses approval chain; ticket nace Aprobada

Tickets creados por hr_admin via `/admin/solicitudes/manual-entry` con `manual_entry=true` saltan completamente el chain digital. ApprovalEngine detecta el flag al crear y NO inserta filas en `requests.approvals`. El ticket nace directamente en status `Aprobada` con `audit.log` entry registrando bypass: `{action='manual_entry_bypass', actor_id=<hr_admin_id>, metadata={original_paper_upload_id, manual_entry: true}}`. La foto del formulario papel firmado se sube a `files.uploads` con `category='original_paper_form'` (R25); puede reemplazarse via DELETE + nuevo INSERT si la foto fue mala.

Confiamos en el hr_admin: NO validamos que las firmas en la foto matcheen los firmantes requeridos por el chain template. Trust + audit trail es suficiente para MVP. Trade-off: si un hr_admin sube papel sin firmas reales, el ticket esta "aprobado" pero invalido. Mitigado via R25 (audit completo, accion atribuible) y revision humana periodica de manual entries.

Alternativa rechazada: proxy mode (hr_admin clickea cada step actuando "en nombre de" cada firmante). Mas estricto en compliance pero borde con R5 (self-approval — hr_admin firmando para president) y demasiado workflow para realidad operacional ICONSA donde personal campo entrega papeles por valija/WhatsApp.
