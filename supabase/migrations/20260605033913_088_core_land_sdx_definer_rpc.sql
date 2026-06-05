-- 088_core_land_sdx_definer_rpc
-- F0.2 (ADR-0032). RPC SECURITY DEFINER para que el Edge sdx-sync (service_role) aterrice records
-- verbatim en raw_spectrum.sdx_landing, que NO esta expuesto en PostgREST (el cliente supabase-js
-- solo alcanza schemas expuestos). La funcion vive en core (expuesto), corre como owner -> escribe raw.
-- Least-privilege (patron mig 077): EXECUTE solo service_role.

CREATE OR REPLACE FUNCTION core.land_sdx(p_batch_id text, p_service text, p_job_filter text, p_records jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE n integer;
BEGIN
  IF p_records IS NULL OR jsonb_typeof(p_records) <> 'array' THEN
    RETURN 0;
  END IF;
  INSERT INTO raw_spectrum.sdx_landing (batch_id, service, job_filter, record)
  SELECT p_batch_id, p_service, p_job_filter, rec
  FROM jsonb_array_elements(p_records) AS rec;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;
COMMENT ON FUNCTION core.land_sdx(text,text,text,jsonb) IS 'SECURITY DEFINER: el Edge sdx-sync (service_role) aterriza records verbatim en raw_spectrum.sdx_landing (schema NO expuesto). EXECUTE service_role-only. ADR-0032.';
REVOKE EXECUTE ON FUNCTION core.land_sdx(text,text,text,jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION core.land_sdx(text,text,text,jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION core.land_sdx(text,text,text,jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION core.land_sdx(text,text,text,jsonb) TO service_role;
