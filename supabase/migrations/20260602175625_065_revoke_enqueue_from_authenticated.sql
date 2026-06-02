-- 065_revoke_enqueue_from_authenticated
-- SEC-ENQUEUE: notifications.enqueue (SECURITY DEFINER) inserta en notifications.outbox para cualquier recipient_id.
-- Era EXECUTE-able por authenticated -> un usuario logueado podia encolar notificaciones a cualquier persona (spoof/spam).
-- Todos los callers de prod usan el admin client (service_role): onboarding/actions.ts (admin) + el cron worker. REVOKE seguro.
-- Mismo patron que 044 (revoke security-definer grants) / 055 (SEC-SEQ). ACL post: postgres=X | service_role=X.
REVOKE EXECUTE ON FUNCTION notifications.enqueue(uuid, text, text, text, text, jsonb, jsonb, text)
  FROM authenticated, anon, public;
