-- 080_create_raw_spectrum_meta_schemas
-- Medallion BRONZE landing (raw_spectrum) + pipeline metadata (meta) schemas.
-- Aditivo. ADR-0032 / SP-0b decision #2. Internos del pipeline: service_role only.
-- NO exponer en Exposed Schemas (PostgREST) - accion manual de Jaime es exponer SOLO core.

CREATE SCHEMA IF NOT EXISTS raw_spectrum;
COMMENT ON SCHEMA raw_spectrum IS
  'Medallion BRONZE: landing verbatim de Spectrum SDX (append-only; _ingested_at/_source/_batch_id). Promovido a core.* por el Edge Function sdx-sync aplicando core.field_authority. Service_role only - NO exponer en PostgREST. ADR-0032 / SP-0b.';

CREATE SCHEMA IF NOT EXISTS meta;
COMMENT ON SCHEMA meta IS
  'Metadata de pipeline/ingesta (watermarks, batch lineage, registro de esquema de fuentes). RESERVADO - se puebla al madurar el medallion; la governance operativa vive en core.*. Service_role only - NO exponer en PostgREST. ADR-0032 / SP-0b.';

-- Privilegios: schemas internos del pipeline (trabajo sin-sesion del Edge sdx-sync).
-- authenticated/anon NO reciben USAGE (fail-closed): la app consume core.*, nunca raw_spectrum/meta.
GRANT USAGE ON SCHEMA raw_spectrum TO service_role;
GRANT USAGE ON SCHEMA meta TO service_role;

-- Default privileges para futuras tablas creadas por el rol de migracion en estos schemas.
-- (Las migraciones de tablas raw tambien haran GRANT explicito; esto es defensa en profundidad.)
ALTER DEFAULT PRIVILEGES IN SCHEMA raw_spectrum
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA meta
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;
