-- Module 1 — Task 7: Storage bucket para adjuntos de solicitudes (Reclamo de Pago, Préstamo, etc).
-- Aplicado via Supabase MCP el 2026-04-28.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'humanos-attachments',
  'humanos-attachments',
  false,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp','application/pdf']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS humanos_attachments_authenticated_insert ON storage.objects;
DROP POLICY IF EXISTS humanos_attachments_authenticated_select ON storage.objects;

CREATE POLICY humanos_attachments_authenticated_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'humanos-attachments');

CREATE POLICY humanos_attachments_authenticated_select
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'humanos-attachments');
