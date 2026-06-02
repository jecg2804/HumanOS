-- 050_requests_next_sequence.sql
-- Audit "seq": requests.sequences has RLS enabled with NO policy (deny-all), so
-- nothing can increment the counter without a SECURITY DEFINER function. Without
-- this helper the FIRST ticket creation in Group 4 would be blocked. Create it now
-- to remove that footgun.
--
-- Atomic: the UPDATE ... RETURNING row-locks the seq row, so concurrent callers
-- serialize and never get a duplicate number.
--
-- NOTE (Group 4): the counter is monotonic (does NOT reset per year). The stored
-- format 'HUM-{year}-{value:04d}' embeds the year but the value keeps climbing
-- (HUM-2027-0153, not reset to 0001). If the SOP wants a per-year reset, revisit
-- when wiring ticket creation.

CREATE OR REPLACE FUNCTION requests.next_sequence(p_seq_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_value bigint;
  v_format text;
BEGIN
  UPDATE requests.sequences
     SET current_value = current_value + 1
   WHERE seq_type = p_seq_type
  RETURNING current_value, format INTO v_value, v_format;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'requests.next_sequence: unknown seq_type %', p_seq_type;
  END IF;

  IF v_format IS NULL THEN
    RETURN v_value::text;
  END IF;

  RETURN replace(
           replace(v_format, '{year}', to_char(now() AT TIME ZONE 'America/Panama', 'YYYY')),
           '{value:04d}', lpad(v_value::text, 4, '0')
         );
END;
$function$;

REVOKE ALL ON FUNCTION requests.next_sequence(text) FROM public;
GRANT EXECUTE ON FUNCTION requests.next_sequence(text) TO authenticated;
GRANT EXECUTE ON FUNCTION requests.next_sequence(text) TO service_role;

COMMENT ON FUNCTION requests.next_sequence(text) IS
  'Atomically increment requests.sequences for p_seq_type and return the formatted '
  'number (e.g. ticket_number -> HUM-2026-0001). SECURITY DEFINER so it can write '
  'the deny-all sequences table. Row-locked: safe under concurrency.';