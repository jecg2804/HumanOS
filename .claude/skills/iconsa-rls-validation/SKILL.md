---
name: iconsa-rls-validation
description: Validate Row Level Security policies after any change to HumanOS schemas. Use whenever the prompt mentions RLS, row level security, policy, policies, FOR SELECT, FOR INSERT, FOR UPDATE, FOR DELETE, USING, WITH CHECK, or after creating/altering a table. Runs SQL queries against pg_policies and pg_class to verify coverage, then suggests fixes.
---

# RLS validation for HumanOS

Every table in HumanOS schemas MUST have RLS enabled and at least one policy. This skill runs a verification suite after migrations.

## Verification queries

### Q1 - Tables without RLS enabled (must return 0 rows)

```sql
SELECT n.nspname || '.' || c.relname AS table_without_rls
FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
WHERE n.nspname IN ('hr','requests','docs','workflows','audit','notifications','files','performance','learning')
  AND c.relkind = 'r'
  AND c.relrowsecurity = false;
```

If returns rows: those tables are unprotected. Add `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` immediately.

### Q2 - Tables with RLS enabled but ZERO policies (must return 0 rows)

```sql
SELECT n.nspname || '.' || c.relname AS table_with_rls_no_policies
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace=n.oid
LEFT JOIN pg_policies p ON p.schemaname=n.nspname AND p.tablename=c.relname
WHERE n.nspname IN ('hr','requests','docs','workflows','audit','notifications','files','performance','learning')
  AND c.relkind = 'r'
  AND c.relrowsecurity = true
GROUP BY n.nspname, c.relname
HAVING count(p.policyname) = 0;
```

If returns rows: RLS is on but no policy = denies ALL access. App will silently fail to read.

### Q3 - Policies count per table

```sql
SELECT schemaname, tablename, count(*) AS policies,
  string_agg(DISTINCT cmd, ', ' ORDER BY cmd) AS commands
FROM pg_policies
WHERE schemaname IN ('hr','requests','docs','workflows','audit','notifications','files','performance','learning')
GROUP BY schemaname, tablename
ORDER BY schemaname, tablename;
```

Check that critical tables have at least SELECT + INSERT + UPDATE policies (DELETE if applicable).

### Q4 - Sensitive tables RLS detail (R13)

```sql
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE (schemaname='hr' AND tablename IN ('medical_info','personal_documents'))
   OR (schemaname='hr' AND tablename='employments' AND policyname LIKE '%salary%')
ORDER BY tablename, cmd;
```

These tables must have policies that filter by `person_id = hr.current_person_id() OR hr.is_hr_admin()`. NEVER expose to supervisors or directorio.

### Q5 - Functional RLS test (impersonate user)

```sql
-- Test: as employee X, can I see employee Y's medical_info? (should be NO)
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub": "<auth_id_of_X>"}';
SELECT count(*) FROM hr.medical_info WHERE person_id = '<id_of_Y>';
RESET ROLE;
-- Expected: 0
```

If returns > 0 for non-admin user accessing another's medical data: policy is wrong.

## Common policy mistakes

| Mistake | Fix |
|---|---|
| `USING (true)` without justification | Use ownership predicate |
| Policy without `TO authenticated` | Add `TO authenticated` (default is `PUBLIC` which is too broad) |
| INSERT/UPDATE without `WITH CHECK` | Always add `WITH CHECK` to validate written rows |
| `auth.uid()` directly in policy | Use `hr.current_person_id()` helper for consistency |
| Helper function without `SECURITY DEFINER` | Add `SECURITY DEFINER SET search_path = ''` |

## Patterns by table type

**Personal data (hr.medical_info, hr.personal_documents)**: SELECT/INSERT/UPDATE/DELETE all = `person_id = hr.current_person_id() OR hr.is_hr_admin()`.

**Catalog tables (hr.org_units, hr.positions, hr.locations, requests.types)**: SELECT for all authenticated. INSERT/UPDATE/DELETE only `hr.is_hr_admin() OR hr.is_president_or_admin()`.

**Ticket-related (requests.tickets, approvals, comments, revisions)**: Use `requests.can_view_ticket(ticket_id)` helper. INSERT validates `requester_id = hr.current_person_id()` for new tickets.

**HR-only (audit.log, requests.audit_log)**: SELECT only `hr.is_hr_admin()`. INSERT via SECURITY DEFINER triggers (bypass RLS).

## What to do after creating/altering a policy

1. Run Q1 to confirm all tables in scope have RLS enabled.
2. Run Q2 to confirm no orphaned RLS (RLS on but no policies).
3. Run Q3 and verify policy count matches expected (SELECT + write policies as needed).
4. For sensitive tables: run Q4 and confirm policies match R13 pattern.
5. For complex policies: run Q5 functional test impersonating users.
6. If using helpers: confirm they exist via `pg_proc` query.

## What NOT to do

- Do not skip Q1/Q2 after migrations — silent security gaps.
- Do not use `USING (true)` without justification in comment.
- Do not rely on app-level filters as substitute for RLS — RLS is the security boundary.
- Do not modify policies on tables `audit.log` and `requests.audit_log` without consulting James — append-only is critical for compliance.
