-- 082_core_reference_catalogs_spectrum
-- F0.2 masters (ADR-0032 / SP-0b decision #3). 5 catalogos de referencia conformados desde
-- Spectrum SDX (validados LIVE 2026-06-05: customers 87, eq_cost_categories 3, wage_codes 38,
-- pay_types 20, deductions_addons 35; natural keys unicos). Patron MDM por tabla:
--   surrogate uuid PK + natural key (UNIQUE parcial WHERE deleted_at IS NULL) + source_system
--   + soft-delete + RLS (SELECT activos|admin; write admin; service_role grants) + COMMENT
--   + {master}_external_ids xref (crosswalk multi-fuente). Helpers: hr.is_hr_admin / hr.touch_updated_at.
-- core NO expuesto aun en PostgREST (accion de Jaime); RLS correcta para cuando se exponga.

-- =========================================================================
-- core.customers  <- GetCustomers (87)
-- =========================================================================
CREATE TABLE core.customers (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_code        text NOT NULL,
  name                 text NOT NULL,
  address_1            text,
  address_2            text,
  city                 text,
  state                text,
  zip_code             text,
  first_name           text,
  last_name            text,
  phone_number         text,
  email                text,
  price_level_material text,
  taxable_flag         text,
  status               text,
  source_system        core.source_system NOT NULL DEFAULT 'spectrum',
  deleted_at           timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_customers_code_active ON core.customers (customer_code) WHERE deleted_at IS NULL;
COMMENT ON TABLE core.customers IS 'Master de clientes conformado desde Spectrum SDX (GetCustomers). Golden record cross-app. Natural key customer_code. ADR-0032.';
COMMENT ON COLUMN core.customers.customer_code IS 'Codigo natural Spectrum (GetCustomers.Customer_Code), ej. A00001. UNIQUE entre filas activas.';
COMMENT ON COLUMN core.customers.email IS 'Spectrum Email1.';
COMMENT ON COLUMN core.customers.deleted_at IS 'Soft-delete. NULL = activo. Spectrum nunca borra fisico; un cliente ausente de un sync se marca deleted_at.';
ALTER TABLE core.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers_select" ON core.customers FOR SELECT TO authenticated USING (deleted_at IS NULL OR hr.is_hr_admin());
CREATE POLICY "customers_insert_admin" ON core.customers FOR INSERT TO authenticated WITH CHECK (hr.is_hr_admin());
CREATE POLICY "customers_update_admin" ON core.customers FOR UPDATE TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY "customers_delete_admin" ON core.customers FOR DELETE TO authenticated USING (hr.is_hr_admin());
CREATE TRIGGER touch_updated_at_customers BEFORE UPDATE ON core.customers FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();
GRANT SELECT ON core.customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.customers TO service_role;

CREATE TABLE core.customers_external_ids (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   uuid NOT NULL REFERENCES core.customers(id) ON DELETE CASCADE,
  source_system core.source_system NOT NULL,
  external_id   text NOT NULL,
  external_data jsonb,
  last_synced_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_system, external_id),
  UNIQUE (customer_id, source_system)
);
COMMENT ON TABLE core.customers_external_ids IS 'Crosswalk de core.customers a IDs de sistemas-fuente (MDM XREF). UNIQUE(source_system,external_id) + UNIQUE(customer_id,source_system).';
ALTER TABLE core.customers_external_ids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers_xref_select_admin" ON core.customers_external_ids FOR SELECT TO authenticated USING (hr.is_hr_admin());
GRANT SELECT ON core.customers_external_ids TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.customers_external_ids TO service_role;

-- =========================================================================
-- core.eq_cost_categories  <- GetEqCostCategory (3)
-- =========================================================================
CREATE TABLE core.eq_cost_categories (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_category_code  text NOT NULL,
  description         text,
  cost_category_type  text,
  status              text,
  cost_center         text,
  source_system       core.source_system NOT NULL DEFAULT 'spectrum',
  deleted_at          timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_eq_cost_categories_code_active ON core.eq_cost_categories (cost_category_code) WHERE deleted_at IS NULL;
COMMENT ON TABLE core.eq_cost_categories IS 'Categorias de costo de equipo conformadas desde Spectrum SDX (GetEqCostCategory). Natural key cost_category_code (ej. FU1). ADR-0032.';
COMMENT ON COLUMN core.eq_cost_categories.cost_category_code IS 'Codigo natural Spectrum (Cost_Category_Code), ej. FU1.';
ALTER TABLE core.eq_cost_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eq_cost_categories_select" ON core.eq_cost_categories FOR SELECT TO authenticated USING (deleted_at IS NULL OR hr.is_hr_admin());
CREATE POLICY "eq_cost_categories_insert_admin" ON core.eq_cost_categories FOR INSERT TO authenticated WITH CHECK (hr.is_hr_admin());
CREATE POLICY "eq_cost_categories_update_admin" ON core.eq_cost_categories FOR UPDATE TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY "eq_cost_categories_delete_admin" ON core.eq_cost_categories FOR DELETE TO authenticated USING (hr.is_hr_admin());
CREATE TRIGGER touch_updated_at_eq_cost_categories BEFORE UPDATE ON core.eq_cost_categories FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();
GRANT SELECT ON core.eq_cost_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.eq_cost_categories TO service_role;

CREATE TABLE core.eq_cost_categories_external_ids (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  eq_cost_category_id  uuid NOT NULL REFERENCES core.eq_cost_categories(id) ON DELETE CASCADE,
  source_system        core.source_system NOT NULL,
  external_id          text NOT NULL,
  external_data        jsonb,
  last_synced_at       timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_system, external_id),
  UNIQUE (eq_cost_category_id, source_system)
);
COMMENT ON TABLE core.eq_cost_categories_external_ids IS 'Crosswalk MDM XREF de core.eq_cost_categories a sistemas-fuente.';
ALTER TABLE core.eq_cost_categories_external_ids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eq_cost_categories_xref_select_admin" ON core.eq_cost_categories_external_ids FOR SELECT TO authenticated USING (hr.is_hr_admin());
GRANT SELECT ON core.eq_cost_categories_external_ids TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.eq_cost_categories_external_ids TO service_role;

-- =========================================================================
-- core.wage_codes  <- GetWageCode (38)
-- =========================================================================
CREATE TABLE core.wage_codes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wage_code         text NOT NULL,
  union_code        text,
  short_description text,
  full_description  text,
  worker_comp_code  text,
  effective_date    date,
  source_system     core.source_system NOT NULL DEFAULT 'spectrum',
  deleted_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_wage_codes_code_active ON core.wage_codes (wage_code) WHERE deleted_at IS NULL;
COMMENT ON TABLE core.wage_codes IS 'Codigos salariales / oficios conformados desde Spectrum SDX (GetWageCode). Natural key wage_code (unico, validado live; Union_Code es atributo). ADR-0032.';
COMMENT ON COLUMN core.wage_codes.wage_code IS 'Codigo natural Spectrum (Wage_Code), ej. AGCADE. Unico (no requiere componer con Union_Code).';
COMMENT ON COLUMN core.wage_codes.effective_date IS 'Spectrum Effective_Date (MM/DD/YYYY) parseado a date por el Edge sdx-sync.';
ALTER TABLE core.wage_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wage_codes_select" ON core.wage_codes FOR SELECT TO authenticated USING (deleted_at IS NULL OR hr.is_hr_admin());
CREATE POLICY "wage_codes_insert_admin" ON core.wage_codes FOR INSERT TO authenticated WITH CHECK (hr.is_hr_admin());
CREATE POLICY "wage_codes_update_admin" ON core.wage_codes FOR UPDATE TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY "wage_codes_delete_admin" ON core.wage_codes FOR DELETE TO authenticated USING (hr.is_hr_admin());
CREATE TRIGGER touch_updated_at_wage_codes BEFORE UPDATE ON core.wage_codes FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();
GRANT SELECT ON core.wage_codes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.wage_codes TO service_role;

CREATE TABLE core.wage_codes_external_ids (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wage_code_id  uuid NOT NULL REFERENCES core.wage_codes(id) ON DELETE CASCADE,
  source_system core.source_system NOT NULL,
  external_id   text NOT NULL,
  external_data jsonb,
  last_synced_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_system, external_id),
  UNIQUE (wage_code_id, source_system)
);
COMMENT ON TABLE core.wage_codes_external_ids IS 'Crosswalk MDM XREF de core.wage_codes a sistemas-fuente.';
ALTER TABLE core.wage_codes_external_ids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wage_codes_xref_select_admin" ON core.wage_codes_external_ids FOR SELECT TO authenticated USING (hr.is_hr_admin());
GRANT SELECT ON core.wage_codes_external_ids TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.wage_codes_external_ids TO service_role;

-- =========================================================================
-- core.pay_types  <- GetPayType (20)
-- =========================================================================
CREATE TABLE core.pay_types (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pay_type      text NOT NULL,
  description   text,
  source_system core.source_system NOT NULL DEFAULT 'spectrum',
  deleted_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_pay_types_code_active ON core.pay_types (pay_type) WHERE deleted_at IS NULL;
COMMENT ON TABLE core.pay_types IS 'Tipos de pago conformados desde Spectrum SDX (GetPayType). Natural key pay_type (ej. R = Regular Pay). ADR-0032.';
COMMENT ON COLUMN core.pay_types.pay_type IS 'Codigo natural Spectrum (Pay_Type), ej. R. description = Pay_Type_Desc.';
ALTER TABLE core.pay_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pay_types_select" ON core.pay_types FOR SELECT TO authenticated USING (deleted_at IS NULL OR hr.is_hr_admin());
CREATE POLICY "pay_types_insert_admin" ON core.pay_types FOR INSERT TO authenticated WITH CHECK (hr.is_hr_admin());
CREATE POLICY "pay_types_update_admin" ON core.pay_types FOR UPDATE TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY "pay_types_delete_admin" ON core.pay_types FOR DELETE TO authenticated USING (hr.is_hr_admin());
CREATE TRIGGER touch_updated_at_pay_types BEFORE UPDATE ON core.pay_types FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();
GRANT SELECT ON core.pay_types TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.pay_types TO service_role;

CREATE TABLE core.pay_types_external_ids (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pay_type_id   uuid NOT NULL REFERENCES core.pay_types(id) ON DELETE CASCADE,
  source_system core.source_system NOT NULL,
  external_id   text NOT NULL,
  external_data jsonb,
  last_synced_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_system, external_id),
  UNIQUE (pay_type_id, source_system)
);
COMMENT ON TABLE core.pay_types_external_ids IS 'Crosswalk MDM XREF de core.pay_types a sistemas-fuente.';
ALTER TABLE core.pay_types_external_ids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pay_types_xref_select_admin" ON core.pay_types_external_ids FOR SELECT TO authenticated USING (hr.is_hr_admin());
GRANT SELECT ON core.pay_types_external_ids TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.pay_types_external_ids TO service_role;

-- =========================================================================
-- core.deductions_addons  <- GetDedAddon (35)
-- =========================================================================
CREATE TABLE core.deductions_addons (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vol_deduct_code text NOT NULL,
  description     text,
  deduct_type     text,
  calc_method     text,
  source_system   core.source_system NOT NULL DEFAULT 'spectrum',
  deleted_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_deductions_addons_code_active ON core.deductions_addons (vol_deduct_code) WHERE deleted_at IS NULL;
COMMENT ON TABLE core.deductions_addons IS 'Deducciones y addons voluntarios conformados desde Spectrum SDX (GetDedAddon). Natural key vol_deduct_code. ADR-0032.';
COMMENT ON COLUMN core.deductions_addons.vol_deduct_code IS 'Codigo natural Spectrum (Vol_Deduct_Code). deduct_type=Deduct_Type (D), calc_method=Calc_Method (F).';
ALTER TABLE core.deductions_addons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deductions_addons_select" ON core.deductions_addons FOR SELECT TO authenticated USING (deleted_at IS NULL OR hr.is_hr_admin());
CREATE POLICY "deductions_addons_insert_admin" ON core.deductions_addons FOR INSERT TO authenticated WITH CHECK (hr.is_hr_admin());
CREATE POLICY "deductions_addons_update_admin" ON core.deductions_addons FOR UPDATE TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY "deductions_addons_delete_admin" ON core.deductions_addons FOR DELETE TO authenticated USING (hr.is_hr_admin());
CREATE TRIGGER touch_updated_at_deductions_addons BEFORE UPDATE ON core.deductions_addons FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();
GRANT SELECT ON core.deductions_addons TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.deductions_addons TO service_role;

CREATE TABLE core.deductions_addons_external_ids (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deduction_addon_id uuid NOT NULL REFERENCES core.deductions_addons(id) ON DELETE CASCADE,
  source_system      core.source_system NOT NULL,
  external_id        text NOT NULL,
  external_data      jsonb,
  last_synced_at     timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_system, external_id),
  UNIQUE (deduction_addon_id, source_system)
);
COMMENT ON TABLE core.deductions_addons_external_ids IS 'Crosswalk MDM XREF de core.deductions_addons a sistemas-fuente.';
ALTER TABLE core.deductions_addons_external_ids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deductions_addons_xref_select_admin" ON core.deductions_addons_external_ids FOR SELECT TO authenticated USING (hr.is_hr_admin());
GRANT SELECT ON core.deductions_addons_external_ids TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.deductions_addons_external_ids TO service_role;
