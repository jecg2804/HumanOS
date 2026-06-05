-- 087_core_masters_full_unique_natural_keys
-- Correccion (descubierta al disenar el upsert del Edge sdx-sync): los masters core usaban
-- UNIQUE PARCIAL (WHERE deleted_at IS NULL). Para semantica de golden-record sync eso es incorrecto:
--   (1) un codigo cerrado-y-reabierto fragmentaria en una fila NUEVA (nuevo id) rompiendo FKs (phases/tickets);
--   (2) Postgres ON CONFLICT (code) NO puede targetear un indice parcial -> el upsert por clave natural falla.
-- Modelo correcto MDM: UNA fila por clave natural (full unique); el sync hace upsert-por-codigo y
-- "des-borra" (deleted_at=NULL) la MISMA fila al reaparecer, preservando id + FKs.

DROP INDEX core.ux_customers_code_active;
CREATE UNIQUE INDEX ux_customers_code ON core.customers (customer_code);

DROP INDEX core.ux_eq_cost_categories_code_active;
CREATE UNIQUE INDEX ux_eq_cost_categories_code ON core.eq_cost_categories (cost_category_code);

DROP INDEX core.ux_wage_codes_code_active;
CREATE UNIQUE INDEX ux_wage_codes_code ON core.wage_codes (wage_code);

DROP INDEX core.ux_pay_types_code_active;
CREATE UNIQUE INDEX ux_pay_types_code ON core.pay_types (pay_type);

DROP INDEX core.ux_deductions_addons_code_active;
CREATE UNIQUE INDEX ux_deductions_addons_code ON core.deductions_addons (vol_deduct_code);

DROP INDEX core.ux_equipment_code_active;
CREATE UNIQUE INDEX ux_equipment_code ON core.equipment (equipment_code);

DROP INDEX core.ux_jobs_number_active;
CREATE UNIQUE INDEX ux_jobs_number ON core.jobs (job_number);

DROP INDEX core.ux_phases_job_code_active;
CREATE UNIQUE INDEX ux_phases_job_code ON core.phases (job_id, phase_code);
