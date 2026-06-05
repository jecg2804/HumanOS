-- 079_create_core_schema_rename_source_system_domain
-- F0.2 paso 1 (ADR-0032 / SP-0b). Operacion de mayor riesgo conceptual: mueve el DOMAIN
-- source_system de mdm -> core; Postgres repunta solo las 16 columnas dependientes.
-- Aislada: NO crea tablas, NO dropea mdm (incidente 066: confirmar Exposed Schemas antes de dropear).

CREATE SCHEMA IF NOT EXISTS core;
COMMENT ON SCHEMA core IS 'Capa MDM de masters conformados (golden record) consumida cross-app (HumanOS, MovimientOS, futuras). ADR-0032 / SP-0b. MDM = la disciplina; core = el schema.';

-- USAGE para que los writes a las 16 columnas tipadas con el DOMAIN no fallen tras el move.
GRANT USAGE ON SCHEMA core TO authenticated, service_role;

-- Mover el unico objeto de mdm (el DOMAIN) a core. Auto-repunta las 16 columnas dependientes.
ALTER DOMAIN mdm.source_system SET SCHEMA core;

-- mdm queda vacio. NO se dropea aqui.
