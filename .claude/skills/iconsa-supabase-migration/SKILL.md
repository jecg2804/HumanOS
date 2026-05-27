---
name: iconsa-supabase-migration
description: Apply ICONSA conventions when creating a Supabase migration (CREATE TABLE, ALTER TABLE, CREATE FUNCTION, CREATE POLICY, CREATE TRIGGER, INSERT seed). Use whenever the prompt mentions migration, apply_migration, CREATE TABLE, ALTER TABLE, schema, RLS, policy, COMMENT, function, trigger, or any DDL operation. Ensures naming convention, COMMENT obligatorio, RLS habilitada, helper functions reused, CHANGELOG entry.
---

# ICONSA Supabase migration workflow

Use `mcp__supabase__apply_migration` for DDL, `mcp__supabase__execute_sql` for DML. Hook `PreToolUse` validates schema permissions and blocks writes to `public.*`, `payroll.*`, `humanos.*`.

## Naming convention

Migration name: `NNN_action_target` snake_case. Examples:
- `026_add_index_tickets_status`
- `027_create_workflows_steps`
- `028_alter_hr_people_add_column_phone_secondary`

`NNN` is the next sequential number. Check `mcp__supabase__list_migrations` first.

## Required elements per migration

### CREATE TABLE checklist

```sql
CREATE TABLE schema.table (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- columns with explicit NOT NULL where applicable
  -- text columns with CHECK constraint or length
  -- timestamptz (not timestamp without timezone)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 1. RLS habilitada
ALTER TABLE schema.table ENABLE ROW LEVEL SECURITY;

-- 2. At least 1 policy (typically SELECT)
CREATE POLICY "table_select_owner_or_admin" ON schema.table
  FOR SELECT TO authenticated
  USING (<ownership_condition> OR hr.is_hr_admin());

-- 3. updated_at trigger
CREATE TRIGGER touch_updated_at_table
  BEFORE UPDATE ON schema.table
  FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();

-- 4. COMMENT ON TABLE
COMMENT ON TABLE schema.table IS 'Purpose. SOR if applicable. Related tables.';

-- 5. COMMENT ON COLUMN for non-obvious columns
COMMENT ON COLUMN schema.table.column IS 'What. Units if applicable. Source.';
```

### MDM-ready table extras (if cross-app entity)

```sql
-- _source column
ALTER TABLE schema.table ADD COLUMN _source text NOT NULL DEFAULT 'manual'
  CHECK (_source IN ('manual', 'payday', 'spectrum', 'b2w', 'projectsight', 'skydata', 'etl-batch'));

-- external_ids table
CREATE TABLE schema.table_external_ids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid NOT NULL REFERENCES schema.table(id) ON DELETE CASCADE,
  system text NOT NULL CHECK (system IN ('payday', 'b2w', 'spectrum', 'projectsight', 'skydata', 'movimientos', 'manual')),
  external_id text NOT NULL,
  last_synced_at timestamptz,
  UNIQUE (system, external_id),
  UNIQUE (table_id, system)
);
```

## Helper functions to reuse (DO NOT REDEFINE)

- `hr.current_person_id() RETURNS uuid` - person_id of current auth.uid()
- `hr.current_app_role() RETURNS text` - employee | hr_admin | president | admin
- `hr.is_hr_admin() RETURNS boolean`
- `hr.is_president_or_admin() RETURNS boolean`
- `hr.is_supervisor_of(person_id uuid) RETURNS boolean`
- `hr.has_direct_reports() RETURNS boolean`
- `hr.touch_updated_at() RETURNS trigger`
- `requests.can_view_ticket(ticket_id uuid) RETURNS boolean`

If you need a similar helper, check first with `pg_proc` query before creating.

## RLS policy patterns

```sql
-- Pattern 1: Owner only
CREATE POLICY "table_select_own" ON schema.table
  FOR SELECT TO authenticated
  USING (person_id = hr.current_person_id());

-- Pattern 2: Owner OR hr_admin
CREATE POLICY "table_select_own_or_admin" ON schema.table
  FOR SELECT TO authenticated
  USING (person_id = hr.current_person_id() OR hr.is_hr_admin());

-- Pattern 3: Universal read, restricted write (catalog tables)
CREATE POLICY "table_select_all" ON schema.table
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "table_write_admin_only" ON schema.table
  FOR ALL TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());

-- Pattern 4: Ticket-related (use can_view_ticket helper)
CREATE POLICY "table_select_ticket" ON schema.table
  FOR SELECT TO authenticated USING (requests.can_view_ticket(ticket_id));
```

## Forbidden patterns

- `CREATE TABLE` without `ENABLE ROW LEVEL SECURITY`
- `CREATE TABLE` without `COMMENT ON TABLE`
- Policy `USING (true)` without justification (only for catalog tables)
- Helper function without `SECURITY DEFINER` + `SET search_path = ''`
- Function calling `auth.uid()` directly without going through helpers
- Foreign key without explicit `ON DELETE` clause
- `text` column without CHECK or reasonable max length
- `timestamp` (no timezone) — always use `timestamptz`

## Post-migration

1. Run `mcp__supabase__list_extensions` and `mcp__supabase__get_advisors` to catch issues.
2. Update `docs/CHANGELOG.md` with entry: `[bd] NNN_migration_name - what changed - why`.
3. If schema affects existing code: update affected files.
4. Verify with `mcp__supabase__list_tables({verbose: true})` that columns are as expected.

## What NOT to do

- Do not write migrations directly via Supabase Dashboard. Use `apply_migration` MCP tool.
- Do not hardcode UUIDs of seed data into migrations. Use deterministic generators or query existing.
- Do not create tables in `public.*`, `payroll.*`, `humanos.*`. Hook blocks.
- Do not skip COMMENT — Supabase Dashboard becomes unusable for Samantha and James.
- Do not skip RLS — security incident risk.
- Do not re-create helper functions that already exist.
