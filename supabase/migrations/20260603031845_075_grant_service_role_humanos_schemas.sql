-- 075_grant_service_role_humanos_schemas
-- P1 (revalidated audit 2026-06-03): service_role had schema USAGE + BYPASSRLS but ZERO table
-- privileges on every HumanOS schema, while it has ALL on 44/44 public (MovimientOS) tables -- the
-- standard Supabase posture. Custom schemas created by migration are NOT auto-granted to
-- service_role (Supabase only auto-grants public). The 067 foundation fix granted `authenticated`
-- but never service_role; the app's admin client (ADR-0006) runs as service_role, so every DIRECT
-- table op (regenerateInviteCodeAction -> hr.invite_codes/audit.log; updateEmployeeAction ->
-- hr.people; cron -> notifications.outbox/hr.people; onboarding direct reads) would 403 at runtime.
-- BYPASSRLS skips policy checks, NOT table grants. Masked so far only because SECURITY DEFINER RPCs
-- run as owner and these flows have barely run for real.
--
-- Fix: restore the intended service_role posture (full access, matching public) on the HumanOS app
-- schemas, incl. future objects via ALTER DEFAULT PRIVILEGES. service_role is the trusted backend
-- key (server-only, already BYPASSRLS); this does NOT touch public/MovimientOS. RLS still governs
-- the `authenticated` role unchanged.
DO $$
DECLARE s text;
BEGIN
  FOREACH s IN ARRAY ARRAY['hr','requests','docs','files','workflows','audit','notifications','learning','performance','mdm']
  LOOP
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO service_role', s);
    EXECUTE format('GRANT ALL ON ALL TABLES IN SCHEMA %I TO service_role', s);
    EXECUTE format('GRANT ALL ON ALL SEQUENCES IN SCHEMA %I TO service_role', s);
    EXECUTE format('GRANT ALL ON ALL FUNCTIONS IN SCHEMA %I TO service_role', s);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL ON TABLES TO service_role', s);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL ON SEQUENCES TO service_role', s);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL ON FUNCTIONS TO service_role', s);
  END LOOP;
END $$;
