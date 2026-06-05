-- 083_core_equipment_master
-- F0.2 master (ADR-0032 / SP-0b). core.equipment conformado desde Spectrum SDX (GetEquipment,
-- validado LIVE 2026-06-05 = 421, equipment_code unico sin blancos). Mismo patron MDM.
-- equipment es el VERDADERO punto de crosswalk cross-app: MovimientOS public.equipment ya tiene
-- spectrum_code (377/377) -> equipment_external_ids es donde aterriza ese mapping (source='b2w'/movimientos).

CREATE TABLE core.equipment (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_code   text NOT NULL,
  equipment_type   text,
  description      text,
  equipment_status text,
  equipment_year   text,
  equipment_make   text,
  equipment_model  text,
  owned_flag       text,
  license_number   text,
  serial_number    text,
  division_code    text,
  cost_center      text,
  source_system    core.source_system NOT NULL DEFAULT 'spectrum',
  deleted_at       timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_equipment_code_active ON core.equipment (equipment_code) WHERE deleted_at IS NULL;
COMMENT ON TABLE core.equipment IS 'Master de equipo conformado desde Spectrum SDX (GetEquipment). Golden record cross-app: MovimientOS public.equipment (modelo rico operacional) ya referencia spectrum_code -> crosswalk via core.equipment_external_ids. Natural key equipment_code. ADR-0032.';
COMMENT ON COLUMN core.equipment.equipment_code IS 'Codigo natural Spectrum (Equipment_Code), ej. AND001.';
COMMENT ON COLUMN core.equipment.equipment_type IS 'Spectrum Equipment_Type (11 valores live: TEC/MAR/ING/EQA/VHL/FND/EQP/GRU/VHP/MOV/EQL...). Categoria de equipo.';
COMMENT ON COLUMN core.equipment.equipment_year IS 'Spectrum Year (codigo 2-digitos, ej. 24). Texto, no entero (es codigo de modelo/anio).';
COMMENT ON COLUMN core.equipment.deleted_at IS 'Soft-delete. NULL = activo.';
ALTER TABLE core.equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "equipment_select" ON core.equipment FOR SELECT TO authenticated USING (deleted_at IS NULL OR hr.is_hr_admin());
CREATE POLICY "equipment_insert_admin" ON core.equipment FOR INSERT TO authenticated WITH CHECK (hr.is_hr_admin());
CREATE POLICY "equipment_update_admin" ON core.equipment FOR UPDATE TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY "equipment_delete_admin" ON core.equipment FOR DELETE TO authenticated USING (hr.is_hr_admin());
CREATE TRIGGER touch_updated_at_equipment BEFORE UPDATE ON core.equipment FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();
GRANT SELECT ON core.equipment TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.equipment TO service_role;

CREATE TABLE core.equipment_external_ids (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id   uuid NOT NULL REFERENCES core.equipment(id) ON DELETE CASCADE,
  source_system  core.source_system NOT NULL,
  external_id    text NOT NULL,
  external_data  jsonb,
  last_synced_at timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_system, external_id),
  UNIQUE (equipment_id, source_system)
);
COMMENT ON TABLE core.equipment_external_ids IS 'Crosswalk MDM XREF de core.equipment a sistemas-fuente. Seam real Spectrum<->MovimientOS: aqui se mapea public.equipment (su id) <-> core.equipment via spectrum_code. UNIQUE(source_system,external_id)+UNIQUE(equipment_id,source_system).';
ALTER TABLE core.equipment_external_ids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "equipment_xref_select_admin" ON core.equipment_external_ids FOR SELECT TO authenticated USING (hr.is_hr_admin());
GRANT SELECT ON core.equipment_external_ids TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.equipment_external_ids TO service_role;
