-- 086_raw_spectrum_sdx_landing
-- F0.2 (ADR-0032 / SP-0b §2). BRONZE landing verbatim de Spectrum SDX. Regla dura del medallion:
-- aterrizar en raw antes de promover a core. Tabla generica (1 fila por <response>), append-only.
-- Service_role only (raw_spectrum NO expuesto); el Edge sdx-sync inserta aqui y promueve a core.

CREATE TABLE raw_spectrum.sdx_landing (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  batch_id    text NOT NULL,
  service     text NOT NULL,
  job_filter  text,
  record      jsonb NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sdx_landing_batch ON raw_spectrum.sdx_landing (batch_id);
CREATE INDEX idx_sdx_landing_service ON raw_spectrum.sdx_landing (service, ingested_at DESC);
COMMENT ON TABLE raw_spectrum.sdx_landing IS 'Medallion BRONZE: landing verbatim de cada <response> de Spectrum SDX (append-only). batch_id agrupa una corrida del Edge sdx-sync; service = servicio Get; job_filter = pJob_Number usado (GetPhase per-job), NULL si no aplica; record = jsonb crudo. Promovido a core.* por sdx-sync. Service_role only, NO exponer. ADR-0032.';
COMMENT ON COLUMN raw_spectrum.sdx_landing.batch_id IS 'Identificador de la corrida (== core.sync_runs.batch_id).';
COMMENT ON COLUMN raw_spectrum.sdx_landing.job_filter IS 'pJob_Number usado en la llamada (para GetPhase per-job); NULL para servicios sin filtro.';

ALTER TABLE raw_spectrum.sdx_landing ENABLE ROW LEVEL SECURITY;
-- raw_spectrum no tiene USAGE para authenticated (mig 080) => inalcanzable via PostgREST.
-- Policy admin-only para debug/inspeccion (satisface checklist; service_role bypassa RLS para los writes del Edge).
CREATE POLICY "sdx_landing_select_admin" ON raw_spectrum.sdx_landing
  FOR SELECT TO authenticated USING (hr.is_hr_admin());
GRANT SELECT, INSERT ON raw_spectrum.sdx_landing TO service_role;
