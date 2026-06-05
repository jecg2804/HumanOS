-- 092_login_resolver_and_login_rate_limit
-- Group 3 auth-flow (SIGNUP-phone + SIGNUP-guardrails). ADDITIVE: NO toca auth.users, NO datos de
-- hr.people. Agrega (1) un resolvedor de identificador de login (email|employee_code -> email canonico
-- de la cuenta auth) para que cuentas con email sintetico/obreros y futuros alias logueen por el path
-- email+password unico; (2) un rate-limiter de LOGIN keyed (identifier_hash, ip) -- el limiter existente
-- check_invite_code_rate_limit esta keyed (invite_code_id, ip) y NO cubre login (guardrail #5).
--
-- Decisiones (ADR-0033 log + keep moving; spec 2026-06-05-signup-cluster-design seccion 4 + 5):
--   - SIGNUP-phone (Recomendacion A): email es el identificador canonico de auth. El login acepta
--     email O employee_code y resuelve a email via esta RPC, luego signInWithPassword({email}).
--     Asi las cuentas con email sintetico @no-mail.iconsa.local (obreros sin buzon) son logueables.
--   - Anti-enumeracion (guardrail #4): la RPC devuelve el email resuelto o NULL de forma uniforme;
--     el caller produce SIEMPRE el mismo error generico ("credenciales incorrectas") sin distinguir
--     "no existe" vs "password incorrecto". Sin cedula/codigo en errores/logs.
--   - Resolucion case-insensitive de employee_code via upper() (usa el indice people_code_ci_unique
--     de mig 091). Solo filas con auth_id IS NOT NULL (cuenta activada) y allowed_apps ? 'humanOS'.
--   - SECURITY DEFINER + search_path='' (estilo del repo): lee auth.users + hr.people (cross-schema).
--     service_role-only (el login server action corre server-side; sin superficie de cliente).
--   - El rate-limiter recibe identifier_hash (SHA256 hex del identificador normalizado, calculado en la
--     app) -- NUNCA el identificador crudo, para no persistir email/codigo en claro (R13 / Ley 81).

-- =========================================================================
-- (1) hr.resolve_login_identifier -- email|employee_code -> email canonico (SIGNUP-phone).
-- =========================================================================
CREATE OR REPLACE FUNCTION hr.resolve_login_identifier(p_identifier text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ident text := trim(coalesce(p_identifier, ''));
  v_email text;
BEGIN
  IF v_ident = '' THEN
    RETURN NULL;
  END IF;

  -- Path A: el identificador es un email -> devolverlo normalizado SOLO si existe una cuenta auth
  -- humanOS con ese email (uniforme: no distingue "no existe"). lower(trim) == el normalizado de la app.
  IF position('@' IN v_ident) > 0 THEN
    SELECT u.email INTO v_email
    FROM auth.users u
    WHERE u.email = lower(v_ident)
      AND (u.raw_app_meta_data -> 'allowed_apps') ? 'humanOS'
    LIMIT 1;
    RETURN v_email;  -- email o NULL
  END IF;

  -- Path B: el identificador es un employee_code -> resolver a la cuenta auth via hr.people.
  -- CI match (upper(), indice people_code_ci_unique). Solo personas activadas (auth_id IS NOT NULL)
  -- cuya cuenta auth tiene humanOS en allowed_apps. El employee_code NUNCA es credencial (guardrail #1):
  -- solo mapea a un USERNAME (email); el password se valida aparte en signInWithPassword.
  SELECT u.email INTO v_email
  FROM hr.people p
  JOIN auth.users u ON u.id = p.auth_id
  WHERE p.auth_id IS NOT NULL
    AND p.employee_code IS NOT NULL
    AND upper(p.employee_code) = upper(v_ident)
    AND (u.raw_app_meta_data -> 'allowed_apps') ? 'humanOS'
  LIMIT 1;

  RETURN v_email;  -- email o NULL
END;
$$;

COMMENT ON FUNCTION hr.resolve_login_identifier(text) IS
  'SIGNUP-phone (Group 3, spec 2026-06-05 seccion 4): resuelve un identificador de login (email O employee_code) al email canonico de la cuenta auth.users del empleado, para que el login email-only soporte tambien codigo de empleado y cuentas con email sintetico @no-mail.iconsa.local (obreros sin buzon). Solo filas con auth_id IS NOT NULL y allowed_apps ? humanOS. employee_code resuelto case-insensitive (upper(), indice people_code_ci_unique). Anti-enumeracion (guardrail #4): devuelve email o NULL de forma uniforme; el caller emite siempre el mismo error generico. El employee_code es USERNAME, nunca credencial (guardrail #1): solo mapea a email; el password se valida en signInWithPassword. SECURITY DEFINER, search_path='''', service_role only.';

REVOKE EXECUTE ON FUNCTION hr.resolve_login_identifier(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION hr.resolve_login_identifier(text) FROM anon;
REVOKE EXECUTE ON FUNCTION hr.resolve_login_identifier(text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION hr.resolve_login_identifier(text) TO service_role;

-- =========================================================================
-- (2) hr.login_attempts + hr.check_login_rate_limit -- rate-limit de LOGIN (guardrail #5).
-- =========================================================================
CREATE TABLE IF NOT EXISTS hr.login_attempts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier_hash  text NOT NULL,
  ip_address       inet NOT NULL,
  attempts         integer NOT NULL DEFAULT 1,
  first_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_attempt_at  timestamptz NOT NULL DEFAULT now(),
  blocked_until    timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT login_attempts_identifier_ip_key UNIQUE (identifier_hash, ip_address),
  CONSTRAINT login_attempts_identifier_hash_format CHECK (identifier_hash ~ '^[0-9a-f]{64}$')
);

COMMENT ON TABLE hr.login_attempts IS
  'Rate-limit de LOGIN keyed (identifier_hash, ip_address) -- guardrail #5 (spec 2026-06-05 seccion 5). Espeja el patron de hr.invite_code_attempts pero para el endpoint de login (el limiter de invite NO cubre login). identifier_hash = SHA256 hex del identificador normalizado, calculado en la app: NUNCA se persiste el email/codigo en claro (R13 / Ley 81). RLS fail-closed: sin policies permisivas para anon/authenticated; solo la RPC SECURITY DEFINER y service_role escriben.';
COMMENT ON COLUMN hr.login_attempts.id IS 'PK sintetica.';
COMMENT ON COLUMN hr.login_attempts.identifier_hash IS 'SHA256 hex (64 chars) del identificador de login normalizado. Hash, nunca el valor en claro (anti-enumeracion + minimizacion de datos Ley 81).';
COMMENT ON COLUMN hr.login_attempts.ip_address IS 'IP del cliente (x-forwarded-for[0] o x-real-ip). Componente de la clave compuesta del rate-limit.';
COMMENT ON COLUMN hr.login_attempts.attempts IS 'Numero de intentos dentro de la ventana actual; se reinicia a 1 cuando first_attempt_at sale de la ventana.';
COMMENT ON COLUMN hr.login_attempts.first_attempt_at IS 'Inicio de la ventana de conteo actual.';
COMMENT ON COLUMN hr.login_attempts.last_attempt_at IS 'Ultimo intento registrado.';
COMMENT ON COLUMN hr.login_attempts.blocked_until IS 'Si NOT NULL y futuro, el par (identifier_hash, ip) esta bloqueado hasta este instante (backoff).';
COMMENT ON COLUMN hr.login_attempts.created_at IS 'Timestamp de creacion de la fila.';
COMMENT ON COLUMN hr.login_attempts.updated_at IS 'Timestamp de la ultima actualizacion de la fila.';

ALTER TABLE hr.login_attempts ENABLE ROW LEVEL SECURITY;

-- Fail-closed: ninguna policy permisiva para anon/authenticated. La tabla se escribe solo via la RPC
-- SECURITY DEFINER (owner) y service_role (que bypassa RLS). Una policy restrictiva explicita documenta
-- la intencion de denegar a roles de cliente.
CREATE POLICY login_attempts_no_client_access ON hr.login_attempts
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

COMMENT ON POLICY login_attempts_no_client_access ON hr.login_attempts IS
  'Fail-closed: niega todo acceso de anon/authenticated. La tabla es infraestructura de rate-limit escrita solo por hr.check_login_rate_limit (SECURITY DEFINER) y service_role.';

CREATE INDEX IF NOT EXISTS idx_login_attempts_blocked_until
  ON hr.login_attempts (blocked_until)
  WHERE blocked_until IS NOT NULL;

CREATE OR REPLACE FUNCTION hr.check_login_rate_limit(
  p_identifier_hash text,
  p_ip_address      inet,
  p_max_attempts    integer DEFAULT 10,
  p_window_minutes  integer DEFAULT 15,
  p_block_minutes   integer DEFAULT 15
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_record hr.login_attempts;
  v_now timestamptz := now();
  v_blocked boolean := false;
  v_attempts_remaining integer;
BEGIN
  INSERT INTO hr.login_attempts (identifier_hash, ip_address, attempts, first_attempt_at, last_attempt_at)
  VALUES (p_identifier_hash, p_ip_address, 1, v_now, v_now)
  ON CONFLICT (identifier_hash, ip_address) DO UPDATE
    SET attempts = CASE
        WHEN hr.login_attempts.first_attempt_at < (v_now - make_interval(mins => p_window_minutes))
          THEN 1
        ELSE hr.login_attempts.attempts + 1
      END,
      first_attempt_at = CASE
        WHEN hr.login_attempts.first_attempt_at < (v_now - make_interval(mins => p_window_minutes))
          THEN v_now
        ELSE hr.login_attempts.first_attempt_at
      END,
      last_attempt_at = v_now,
      updated_at = v_now,
      blocked_until = CASE
        WHEN hr.login_attempts.attempts + 1 >= p_max_attempts
             AND hr.login_attempts.first_attempt_at >= (v_now - make_interval(mins => p_window_minutes))
          THEN v_now + make_interval(mins => p_block_minutes)
        ELSE hr.login_attempts.blocked_until
      END
  RETURNING * INTO v_record;

  IF v_record.blocked_until IS NOT NULL AND v_record.blocked_until > v_now THEN
    v_blocked := true;
  END IF;

  v_attempts_remaining := GREATEST(0, p_max_attempts - v_record.attempts);

  RETURN jsonb_build_object(
    'blocked', v_blocked,
    'blocked_until', v_record.blocked_until,
    'attempts', v_record.attempts,
    'attempts_remaining', v_attempts_remaining,
    'window_started_at', v_record.first_attempt_at
  );
END;
$$;

COMMENT ON FUNCTION hr.check_login_rate_limit(text, inet, integer, integer, integer) IS
  'Rate-limit de LOGIN (guardrail #5, spec 2026-06-05 seccion 5). Espeja hr.check_invite_code_rate_limit pero keyed (identifier_hash, ip_address) para el endpoint de login. Upsert atomico que cuenta intentos por ventana deslizante y bloquea con backoff al superar p_max_attempts. Devuelve jsonb {blocked, blocked_until, attempts, attempts_remaining, window_started_at}. Recibe identifier_hash (SHA256 hex de la app), nunca el identificador en claro. Defaults 10 intentos / 15 min ventana / 15 min bloqueo (login es mas permisivo que invite: 5). SECURITY DEFINER, search_path='''', service_role only.';

REVOKE EXECUTE ON FUNCTION hr.check_login_rate_limit(text, inet, integer, integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION hr.check_login_rate_limit(text, inet, integer, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION hr.check_login_rate_limit(text, inet, integer, integer, integer) FROM authenticated;
GRANT  EXECUTE ON FUNCTION hr.check_login_rate_limit(text, inet, integer, integer, integer) TO service_role;
