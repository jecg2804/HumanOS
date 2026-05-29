# supabase/

Version-controlled database layer for HumanOS. The **live Supabase project**
(`bzeoszympkkicwlfdtcn`, SHARED with MovimientOS) is the source of truth.

## migrations/

Going forward (framework v2 + audit P1-SQL), every DDL change is:

1. **Written** as a committed `.sql` file here — `NNN_action_target.sql`, snake_case, per skill
   `iconsa-supabase-migration` (RLS enabled + ≥1 policy, `COMMENT ON TABLE`/`COLUMN`, reuse
   helpers, R1-R27).
2. **Reviewed** as a diff (RLS, `SECURITY DEFINER`, COMMENT, business rules) — `iconsa-rls-validation`.
3. **Applied** to the live DB via the Supabase MCP (`apply_migration`).

This gives diff-review + reproducibility for all NEW schema — the audit's actual concern
("no diff-level review of RLS / SECURITY DEFINER"). The `.sql` file is the reviewable artifact;
the MCP applies the same SQL.

## Schema baseline — PENDING (infra-blocked)

A full baseline snapshot of the existing HumanOS schemas
(`hr/requests/docs/workflows/audit/notifications/files/performance/learning`) is **not yet in the
repo**. Generating it needs `supabase db dump` (requires Docker) or `pg_dump` (postgres client) —
neither is available in the agent environment. To capture it on a machine with Docker:

```bash
supabase link --project-ref bzeoszympkkicwlfdtcn
supabase db dump --schema hr,requests,docs,workflows,audit,notifications,files,performance,learning \
  -f supabase/schemas/humanos_baseline.sql
```

The 100+ historical migrations (52 MovimientOS + ~47 HumanOS) live only in
`supabase_migrations.schema_migrations` on the remote. Do NOT `supabase db push` against the shared
prod DB — the live DB is SOR; pushing would attempt to recreate existing objects.

## .temp/ — gitignored Supabase CLI link state.
