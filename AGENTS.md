# AGENTS.md — HumanOS

Entry delgado para agentes que NO cargan `CLAUDE.md` automáticamente (p. ej. Codex). **`CLAUDE.md` es el contrato completo** — léelo. Esto es solo el mínimo para no romper nada.

## Lee primero

1. `CLAUDE.md` (raíz) — contrato de comportamiento + reglas R1-R27.
2. `docs/STATUS.md` — estado vivo, backlog, blockers (el ÚNICO doc de estado).
3. `docs/reference/` (just-in-time): `business-rules.md`, `schemas-permisos.md`, `framework.md`, `domain.md`, `mvp-scope.md`. Índice en `docs/reference/README.md`.

## Reglas duras (no negociables)

- **Schemas prohibidos** (hooks bloquean writes): `public.*`, `payroll.*`, `humanos.*`. Tocables: `hr.*`, `requests.*`, `docs.*`, `workflows.*`, `audit.*`, `notifications.*`, `files.*`, `performance.*`, `learning.*`, `mdm.*`, `etl.*`, `backup.*`.
- **`auth.users` compartido** (R22): nunca DELETE/UPDATE sin filtro `allowed_apps` + snapshot a `backup.*`.
- **R13 datos sensibles** (`hr.medical_info`, `hr.personal_documents`): owner + hr_admin únicamente.
- **R23 encoding:** UTF-8 sin BOM; hooks `.ps1` ASCII puro.
- **Idioma UI:** español neutro Panamá. **NUNCA voseo** (usa tú/tienes/puedes/verifica). El lint `iconsa/no-voseo` es `error`.
- **Schema-first:** no cambies la forma del esquema sin diseño aprobado por Jaime. **No `supabase db push`** (drift abierto, ver STATUS).
- **No estimar tiempos** (P1/P2/P3 + trivial/non-trivial/alta-complejidad).
- **BD = fuente de verdad** para estado vivo (conteos, migraciones): consultar vía Supabase MCP, no duplicar en docs.

## Gate antes de marcar done

`npm run verify` (typecheck + lint + test + e2e + build). Docs vivos en el MISMO commit (CHANGELOG, STATUS, ADR si hubo decisión).
