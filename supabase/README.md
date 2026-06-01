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

## schemas/ — baseline snapshot

`schemas/humanos_baseline.sql` is a point-in-time baseline of the 9 HumanOS schemas
(`hr/requests/docs/workflows/audit/notifications/files/performance/learning`): 60 tables, 308
constraints, 143 indexes, 105 RLS policies, 15 functions, 38 triggers, and 737 comments.

It is **introspection-generated** (reconstructed 2026-06-01 from the Postgres system catalogs via the
Supabase MCP — `pg_get_constraintdef` / `pg_get_indexdef` / `pg_get_functiondef` / `pg_policies` /
`format_type`), **not** a `pg_dump`. It is high-fidelity but not byte-identical and deliberately omits
GRANTs, ownership, sequence state, extensions, and custom types. Treat it as a **reference/diff
artifact**, not a restore script. Do NOT hand-edit it to drive schema changes — regenerate it.

To refresh it without Docker: re-run the catalog introspection via the Supabase MCP. To produce the
**canonical** `pg_dump` version (optional upgrade) on a machine with Docker Desktop running:

```bash
supabase link --project-ref bzeoszympkkicwlfdtcn
supabase db dump --schema hr,requests,docs,workflows,audit,notifications,files,performance,learning \
  -f supabase/schemas/humanos_baseline.sql
```

The 90+ historical migrations (MovimientOS + HumanOS) live only in
`supabase_migrations.schema_migrations` on the remote. Do NOT `supabase db push` against the shared
prod DB — the live DB is SOR; pushing would attempt to recreate existing objects.

## .temp/ — gitignored Supabase CLI link state
