-- 048_notifications_outbox_dedupe.sql
-- Audit BE-2: make notifications.enqueue idempotent.
--
-- Problem: notifications.enqueue inserts into notifications.outbox with no dedup,
-- so a double-submit or a server-action retry produces duplicate in-app + email
-- notifications. Fix: an optional idempotency key. When the caller passes a
-- dedupe_key, re-enqueuing the same logical event becomes a no-op
-- (ON CONFLICT DO NOTHING). NULL dedupe_key keeps legacy behavior (no dedup).
--
-- Scope: notifications schema only. No data migration (existing rows keep NULL).

-- 1. Idempotency column + partial unique index (channel-scoped: in_app and email
--    are distinct deliveries of the same logical event).
ALTER TABLE notifications.outbox ADD COLUMN IF NOT EXISTS dedupe_key text;

COMMENT ON COLUMN notifications.outbox.dedupe_key IS
  'Optional idempotency key (BE-2). When set, (channel, dedupe_key) is unique so '
  'enqueue of the same logical event is a no-op. NULL = no dedup (legacy behavior).';

CREATE UNIQUE INDEX IF NOT EXISTS outbox_dedupe_key_uidx
  ON notifications.outbox (channel, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

-- 2. Recreate enqueue with a p_dedupe_key parameter (DEFAULT NULL keeps existing
--    7-arg call sites working). DROP first because the signature changes.
DROP FUNCTION IF EXISTS notifications.enqueue(uuid, text, text, text, text, jsonb, jsonb);

CREATE OR REPLACE FUNCTION notifications.enqueue(
  p_recipient_id uuid,
  p_notification_type text,
  p_subject text,
  p_body text,
  p_template_code text,
  p_template_variables jsonb,
  p_metadata jsonb,
  p_dedupe_key text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_pref jsonb;
  v_email_opted_in boolean;
BEGIN
  INSERT INTO notifications.outbox (
    recipient_id, channel, status, subject, body,
    template_code, template_variables, metadata, notification_type, dedupe_key
  ) VALUES (
    p_recipient_id, 'in_app', 'pending', p_subject, p_body,
    p_template_code, p_template_variables, p_metadata, p_notification_type, p_dedupe_key
  )
  ON CONFLICT (channel, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;

  SELECT preferences -> 'notifications' -> 'email' -> p_notification_type
  INTO v_pref
  FROM hr.user_settings
  WHERE person_id = p_recipient_id;

  v_email_opted_in := COALESCE(v_pref::boolean, true);

  IF v_email_opted_in THEN
    INSERT INTO notifications.outbox (
      recipient_id, channel, status, subject, body,
      template_code, template_variables, metadata, notification_type, dedupe_key
    ) VALUES (
      p_recipient_id, 'email', 'pending', p_subject, p_body,
      p_template_code, p_template_variables, p_metadata, p_notification_type, p_dedupe_key
    )
    ON CONFLICT (channel, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
  END IF;
END;
$function$;

-- 3. Restore grants (DROP removed them). Mirrors prior state: postgres owns;
--    authenticated + service_role execute.
REVOKE ALL ON FUNCTION notifications.enqueue(uuid, text, text, text, text, jsonb, jsonb, text) FROM public;
GRANT EXECUTE ON FUNCTION notifications.enqueue(uuid, text, text, text, text, jsonb, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION notifications.enqueue(uuid, text, text, text, text, jsonb, jsonb, text) TO service_role;

COMMENT ON FUNCTION notifications.enqueue(uuid, text, text, text, text, jsonb, jsonb, text) IS
  'Enqueue an in-app notification (+ email if the recipient opted in). Pass p_dedupe_key '
  'for idempotency (BE-2): same key + channel is inserted at most once.';
