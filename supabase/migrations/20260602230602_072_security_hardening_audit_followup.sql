-- 072_security_hardening_audit_followup
-- From the foundation reality-audit (2026-06-02). Two defense-in-depth hardenings:
--
-- (1) hr.create_default_user_settings() is a TRIGGER function (fires via
--     hr_people_default_settings_trigger AFTER INSERT on hr.people). It does NOT need to be directly
--     EXECUTE-able via the REST API by anon/authenticated. REVOKE reduces attack surface; the trigger
--     still fires (trigger invocation does not check EXECUTE privilege). Matches the SEC-ENQUEUE
--     pattern (044/065) of locking SECURITY DEFINER write-fns to service_role/owner only.
--     Verified: a rolled-back test insert into hr.people still created the user_settings row via the
--     trigger, while direct EXECUTE is now denied to anon/authenticated/service_role.
REVOKE EXECUTE ON FUNCTION hr.create_default_user_settings() FROM anon, authenticated, public;
--
-- (2) requests.sequences uses deny-all RLS (RLS enabled, accessed only via the SECURITY DEFINER
--     requests.next_sequence()). It had RLS on but ZERO policies (deny-all by ABSENCE of policy).
--     Add an EXPLICIT deny-all policy so the lock is intentional + visible (defense-in-depth).
--     next_sequence() is SECURITY DEFINER (runs as owner) so it bypasses RLS and keeps working.
CREATE POLICY "sequences_deny_all_non_definer" ON requests.sequences
  FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);
