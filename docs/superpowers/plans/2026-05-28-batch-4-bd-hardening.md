# Batch 4 — BD Hardening (SQL plan para Chat via MCP)

**Fecha**: 2026-05-28
**Owner**: Claude Code prepara SQL; **Chat ejecuta via Supabase MCP** (three-actor model)
**Aprobación requerida**: James por operación (las 4 son DDL; #1 es destructiva irreversible)
**Promise**: parte de `<promise>BATCH_1_2_3_4_COMMITTED</promise>` — Batch 4 = solo plan committed; ejecución BD queda en Chat
**Predecesores**: commits `3e82240` B1 + `6cbd643` B2 + `c97e0c3` B3

---

## IMPORTANTE — Code NO aplica estos writes

Per directiva James 2026-05-28 PARTE D: "Batch 4 BD — NO apliques writes. Prepara SQL en plan; Chat ejecuta via Supabase MCP con aprobacion James por op". Code solo redacta este doc. Las verificaciones (read-only) que Code corrió para preparar SQL preciso están anotadas inline.

**NO incluido en Batch 4** (diferido per directiva PARTE B):
- P2.23 FK indexes (63) → checklist pre-Group-4 (Group 3 es Profile, no toca tickets)
- P2.24 COMMENT ON COLUMN backfill (38 tablas) → higiene incremental al tocar cada tabla

---

## Estado verificado (read-only, 2026-05-28)

| Item | Verificación | Resultado |
|---|---|---|
| backup.* | `count(*) pg_class relkind='r' nspname='backup'` | **63 tablas** presentes |
| índice dup hr.people | `pg_constraint contype` ambos | **AMBOS son UNIQUE constraints** (`people_code_key` + `people_code_unique`) → DROP CONSTRAINT, no DROP INDEX |
| touch_updated_at | `pg_get_functiondef` | LANGUAGE plpgsql, **sin SET search_path** (advisor flag confirmado), SECURITY INVOKER (default) |
| find_auth_user_by_identifier | `pg_get_functiondef` | RETURNS TABLE incluye `encrypted_password text`; SECURITY DEFINER; `SET search_path TO ''`; grants solo **service_role + postgres** (NO anon/authenticated) |

---

## Op 1 — DROP SCHEMA backup CASCADE (P1.3, destructiva)

**Aprobado**: James 2026-05-28 ("DROP, no REVOKE"). Los 63 snapshots fueron red de seguridad de la consolidación core.identities (029-032, rolled back en 032). v0.0.2 shippeó sin depender de ellos. Resuelve el advisor `rls_disabled` critical (63 tablas expuestas a anon incluyendo snapshot de auth.users).

**Pre-flight obligatorio** (Chat ejecuta SELECT antes del DROP, muestra a James):
```sql
-- Confirmar que NADA fuera de backup.* depende de estas tablas (FKs entrantes)
SELECT con.conname, n.nspname AS dependent_schema, tbl.relname AS dependent_table
FROM pg_constraint con
JOIN pg_class tbl ON tbl.oid = con.conrelid
JOIN pg_namespace n ON n.oid = tbl.relnamespace
JOIN pg_class ftbl ON ftbl.oid = con.confrelid
JOIN pg_namespace fn ON fn.oid = ftbl.relnamespace
WHERE fn.nspname = 'backup' AND con.contype = 'f' AND n.nspname <> 'backup';
-- Expected: 0 rows (nada depende de backup.*)

-- Inventario final antes de borrar (log para auditoría)
SELECT count(*) AS backup_tables, sum(pg_total_relation_size(c.oid)) AS total_bytes
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'backup' AND c.relkind = 'r';
```

**Migration** (nombre: `040_drop_backup_schema`):
```sql
-- Batch 4 Op 1 — resolve advisor rls_disabled critical.
-- 63 snapshot tables from core.identities consolidation safety net (029-032 rolled back).
-- Approved James 2026-05-28. Irreversible.
DROP SCHEMA backup CASCADE;
```

**Rollback**: NO hay. Es irreversible by design. Si se necesitara recuperar un snapshot puntual, re-crear desde la fuente viva (auth.users / hr.* / public.* siguen intactos). Por eso el pre-flight FK check es obligatorio.

**Post-apply verification**:
```sql
SELECT count(*) FROM pg_namespace WHERE nspname = 'backup';  -- Expected: 0
-- Re-run security advisor: rls_disabled critical debe desaparecer
```

**Nota**: tras esto, `backup.*` sigue en la allow-list de CLAUDE.md / hooks (futuro uso MDM/ETL). No se quita — solo se vacía. Hook `pre-tool-use.ps1` sigue permitiendo writes a backup.* para snapshots futuros (R22 pattern).

---

## Op 2 — ALTER FUNCTION hr.touch_updated_at SET search_path (P2.22)

**Advisor**: `function_search_path_mutable`. La función es trigger BEFORE UPDATE en muchas tablas; mutable search_path permite `pg_temp` shadowing. Mantener SECURITY INVOKER (correcto — solo setea NEW.updated_at, no escala privilegios); solo pinear search_path.

**Migration** (nombre: `041_pin_touch_updated_at_search_path`):
```sql
-- Batch 4 Op 2 — resolve advisor function_search_path_mutable.
-- now() vive en pg_catalog; public por defensa. SECURITY INVOKER se mantiene.
ALTER FUNCTION hr.touch_updated_at() SET search_path = pg_catalog, public;
```

**Rollback**:
```sql
ALTER FUNCTION hr.touch_updated_at() RESET search_path;
```

**Post-apply verification**:
```sql
SELECT proname, proconfig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='hr' AND p.proname='touch_updated_at';
-- Expected: proconfig = {search_path=pg_catalog, public}
```

**No requiere recrear triggers** — `ALTER FUNCTION ... SET` no cambia la firma, los triggers existentes siguen apuntando a la misma función.

---

## Op 3 — Drop duplicate UNIQUE constraint hr.people (P2.26)

**Hallazgo**: DOS constraints UNIQUE idénticos sobre `hr.people(employee_code)`:
- `people_code_key` — nombre auto-convencional Postgres (de la column UNIQUE original). **MANTENER**.
- `people_code_unique` — redundante, añadido por migración `002b_fix_employee_code_nullable`. **DROP**.

Ambos respaldan constraints (`contype='u'`), por eso es `DROP CONSTRAINT`, no `DROP INDEX` (DROP INDEX falla en index constraint-backed).

**Migration** (nombre: `042_drop_duplicate_people_code_constraint`):
```sql
-- Batch 4 Op 3 — resolve advisor duplicate_index.
-- Two redundant UNIQUE constraints on hr.people(employee_code) since migration 002b.
-- Keep people_code_key (Postgres conventional name); drop people_code_unique.
ALTER TABLE hr.people DROP CONSTRAINT people_code_unique;
```

**Rollback**:
```sql
ALTER TABLE hr.people ADD CONSTRAINT people_code_unique UNIQUE (employee_code);
```

**Post-apply verification**:
```sql
SELECT conname FROM pg_constraint con
JOIN pg_class tbl ON tbl.oid=con.conrelid JOIN pg_namespace n ON n.oid=tbl.relnamespace
WHERE n.nspname='hr' AND tbl.relname='people' AND con.contype='u'
  AND conname LIKE 'people_code%';
-- Expected: 1 row (people_code_key). people_code_unique gone.
```

---

## Op 4 — Redefine find_auth_user_by_identifier sin encrypted_password (NEW.C)

**Hallazgo**: la función SECURITY DEFINER retorna `encrypted_password text` en su TABLE signature innecesariamente. Hoy grants = solo service_role + postgres (no anon/authenticated), así que la exposición es limitada — pero defense-in-depth: si alguien otorga EXECUTE a authenticated en el futuro, recibirían bcrypt hashes. Ningún caller lo lee (Batch 3 removió la llamada de validateInviteCodeAction; completeOnboardingAction solo lee `id` + `raw_app_meta_data`).

**Requiere DROP + CREATE** (no CREATE OR REPLACE): cambiar columnas de RETURNS TABLE da error "cannot change return type of existing function".

**Migration** (nombre: `043_find_auth_user_drop_encrypted_password`):
```sql
-- Batch 4 Op 4 (NEW.C) — remove encrypted_password from RETURNS TABLE (defense-in-depth).
-- No caller reads it (Batch 3 c97e0c3 removed validateInviteCodeAction call;
-- completeOnboardingAction reads only id + raw_app_meta_data).
DROP FUNCTION IF EXISTS hr.find_auth_user_by_identifier(text, text);

CREATE FUNCTION hr.find_auth_user_by_identifier(p_field text, p_value text)
  RETURNS TABLE(id uuid, email text, phone text, raw_app_meta_data jsonb)
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path TO ''
AS $function$
  SELECT id, email, phone, raw_app_meta_data
  FROM auth.users
  WHERE (p_field = 'email' AND email = lower(trim(p_value)))
     OR (p_field = 'phone' AND phone = p_value)
  LIMIT 1;
$function$;

COMMENT ON FUNCTION hr.find_auth_user_by_identifier(text, text) IS 'Onboarding multi-app detection. SECURITY DEFINER reads auth.users by email/phone. NEW.C Batch 4: encrypted_password removed from returns (defense-in-depth, no caller used it). Grants: service_role only.';

-- Re-grant (grants dropped with function). Only service_role (matches pre-Batch-4 state; NOT anon/authenticated).
GRANT EXECUTE ON FUNCTION hr.find_auth_user_by_identifier(text, text) TO service_role;
```

**Rollback** (restaura encrypted_password en returns):
```sql
DROP FUNCTION IF EXISTS hr.find_auth_user_by_identifier(text, text);
CREATE FUNCTION hr.find_auth_user_by_identifier(p_field text, p_value text)
  RETURNS TABLE(id uuid, email text, phone text, raw_app_meta_data jsonb, encrypted_password text)
  LANGUAGE sql SECURITY DEFINER SET search_path TO ''
AS $function$
  SELECT id, email, phone, raw_app_meta_data, encrypted_password
  FROM auth.users
  WHERE (p_field = 'email' AND email = lower(trim(p_value)))
     OR (p_field = 'phone' AND phone = p_value)
  LIMIT 1;
$function$;
GRANT EXECUTE ON FUNCTION hr.find_auth_user_by_identifier(text, text) TO service_role;
```

**Post-apply verification**:
```sql
SELECT pg_get_function_result(p.oid) AS returns
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='hr' AND p.proname='find_auth_user_by_identifier';
-- Expected: returns NO incluye encrypted_password
```

**Code follow-up post-apply** (Code, no Chat):
- `database.types.ts`: quitar `encrypted_password: string | null` del `find_auth_user_by_identifier.Returns` (línea ~1549). Idealmente `supabase gen types` regenera; mientras tanto edición manual.
- Verificar que `completeOnboardingAction` cast `{ id, raw_app_meta_data }` sigue compilando (no lee encrypted_password). Ya verificado en Batch 3.

---

## Orden de ejecución recomendado (Chat)

1. **Op 2** (touch_updated_at) — más segura, no destructiva, no afecta datos
2. **Op 3** (drop dup constraint) — segura, rollback trivial
3. **Op 4** (find_auth_user) — DROP+CREATE, rollback documentado
4. **Op 1** (DROP backup) — última, irreversible, requiere pre-flight FK check + OK final James

Cada op = una migración separada (nombres 040-043) para rollback granular y bisect-friendly del historial de migraciones.

---

## Post-Batch-4 (Code)

Tras Chat aplicar las 4 ops:
1. `mcp__supabase__generate_typescript_types` → regenerar `database.types.ts` (captura find_auth_user sin encrypted_password + cualquier drift)
2. `npm run typecheck` confirmar compila
3. Re-run security advisors → confirmar `rls_disabled` critical + `function_search_path_mutable` (touch_updated_at) + `duplicate_index` resueltos
4. CHANGELOG entry `[bd]` con las 4 migraciones
5. Redimir `<promise>BATCH_1_2_3_4_COMMITTED</promise>` o `PARTIAL` si Chat no aplicó todo

---

## Checklist diferido pre-Group-4 (registrar, NO ahora)

- **P2.23**: migración FK indexes (63 unindexed FKs, hot en requests.tickets cuando Group 4-5 los use). Mecánica, ~1 migración.
- **P2.24**: COMMENT ON COLUMN backfill (38 tablas, peor hr.user_settings 10/13). Higiene incremental.

Code anota estos en memory para recordarlos cuando Group 4 (tickets) se acerque.
