-- 060_consent_scopes_expand_and_id_comment
-- Expande los scopes de consentimiento Ley 81 (3 -> 6) + completa COMMENTs (consent 11/11).
-- consent recien creada (059), 0 filas -> swap de CHECK trivial.

ALTER TABLE hr.consent DROP CONSTRAINT consent_scope_check;
ALTER TABLE hr.consent ADD CONSTRAINT consent_scope_check
  CHECK (scope IN ('medical','emergency_contact','data_processing','photo_image','data_sharing','background_check'));
COMMENT ON COLUMN hr.consent.scope IS 'Categoria de consentimiento Ley 81: medical | emergency_contact | data_processing | photo_image (uso de imagen/foto) | data_sharing (cesion a terceros: Payday/CSS/banco) | background_check (verificacion de referencias). Texto legal por version en legal_version.';
COMMENT ON COLUMN hr.consent.id IS 'PK del registro de consentimiento.';
