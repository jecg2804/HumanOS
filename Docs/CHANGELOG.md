# HumanOS Changelog

Formato: cada sesión agrega una entrada con fecha. Para cambios de BD usar `[bd]` (Code aplica directo en branch).

---

## 2026-04-28 — Branch + schema inicial

### [bd] Branch Supabase aislado
- Creado branch `humanos-dev` en Supabase, project_ref `woonbmfmconldxbeqdnr`.
- Costo: $0.01344/hr.
- Aislamiento: NO comparte data con producción (`bzeoszympkkicwlfdtcn`) ni staging.

### [bd] Schema `humanos` creado desde cero en el branch
- `humanos.people` — tabla consolidada con identidad + datos personales + laborales (28 columnas). 239 empleados migrados desde `ICONSA EmployeeDatabase version datos.xlsx` (sheet "Database"): 52 activos, 187 históricos. Emails limpiados de prefijo `mailto:` residual del Excel. Duplicados por re-contratación disambiguados con sufijo numérico (Hector Pino 2, Marisa Pozza 2, Stefani Madrid 2, Jorge Torres 2, Argelia Ugarte 2, Andrés Solís 2). RLS habilitado, audit columns (`created_at`, `updated_at`, trigger).
  - **Deuda técnica documentada** en `CLAUDE.md`: tabla mal normalizada (1 tabla con 28 cols mezclando 3 dominios). Aceptado para velocidad del MVP. Code puede normalizar si bloquea.
- `humanos.request_types` — 12 tipos de solicitud seeded con sop_reference, approval_chain, category, icon. Tipos: VACACIONES, PERMISO, ACTUALIZACION_DATOS, CONSTANCIA_TRABAJO, HORAS_EXTRAS, PRESTAMO, ACCION_PERSONAL, RECLAMO_PAGO, LIQUIDACION, REFERENCIA_LABORAL, CAPACITACION, ENTREVISTA_SALIDA.
- `humanos.requests` — solicitudes. FKs a request_types y people. form_data JSONB. Estados: Borrador → Enviada → En Revisión → Aprobada/Rechazada → Completada/Cancelada.
- `humanos.request_approvals` — cadena de aprobaciones por solicitud. FK approver_id → people. decision: Pendiente/Aprobada/Rechazada/Solicita Info.
- `humanos.sequences` — auto-numeración (formato HUM-YYYY-NNNN).

### Repo
- 39 SOPs y formularios de RRHH agregados a `Docs/SOPs, Formularios y Documentos/` (PDFs originales de ICONSA). Code los consulta directamente cuando trabaja en cada formulario.
- `CLAUDE.md`, `humanos-mvp-spec.md`, `.claude/rules/supabase-branch.md`, `Docs/CHANGELOG.md` actualizados para reflejar arquitectura branch + DDL/DML libre en `humanos.*`.
- `.claude/rules/supabase-readonly.md` REMOVIDO (reemplazado por `supabase-branch.md`).
- `Docs/feature-specs/MODULE-1-SOLICITUDES.md` creado — guía priorizada de los 5 forms P1.

---

## 2026-04-28 — Module 1 implementación (Fase 0)

### Repo
- Scaffold Next.js 16 + TypeScript strict + Tailwind 4 + ESLint flat config (commit `eef1be9`). Notas: `next lint` removido en Next 16 (ahora `eslint .`); `eslint-config-next` v16 exporta flat config nativo (no `FlatCompat`); `typedRoutes` desactivado para MVP (bloquea redirects dinámicos).
- Supabase clients (`server`, `browser`, `admin`) en `src/lib/supabase/` + tipos compartidos en `src/types/database.ts` (`ab6b94d`).
- Auth flow: `middleware.ts`, `/login` page + actions, `getMe()` con cache + role determination (`c139aed`).
- shadcn/ui base instalado (`94fcb6c`): button, input, label, select, textarea, card, dialog, badge, sonner. Tokens ICONSA (navy/gold/etc) preservados en `globals.css` junto a tokens de shadcn.
- AppShell con sidebar desktop + bottom-tabs mobile + UserMenu con logout (`29fa107`). Item "Admin" visible solo si `me.role === 'hr_admin'`.
- Resend client + 3 templates HTML (solicitud-enviada, solicitud-decidida, decision-final) con header navy/gold + footer estándar + test-mode redirect via `NOTIFICATION_TEST_EMAIL` (`32f749d`).

### [bd] Storage bucket para adjuntos
- Bucket `humanos-attachments` creado: privado, 10MB max, MIME jpeg/png/webp/pdf.
- Policies sobre `storage.objects`: authenticated INSERT y SELECT scopeadas al bucket. (Migration: `supabase/migrations/20260428_007_create_storage_bucket.sql`).

### [bd] Seed de supervisor_id por departamento (plan B del spec §4.1.1)
- 35 de 52 activos ahora tienen `supervisor_id`. Mapeo: RH→KOSM01, Equipo→VAL130, Ingeniería→AVE629, Contabilidad→RIO806, Construcción→Franklin Marciaga (Denise Marciaga está Inactivo, fallback per nota original), CUC166+EIS809→EIS772, top-tier managers (KOSM01/VAL130/AVE629/RIO806/Franklin)→EIS772.
- 17 activos quedan con `supervisor_id=NULL`: Cumplimiento (3), Seguridad (3), Presupuesto (2), Movilizaciones (1), VAL130 mismo (1), Administración general (7), EIS772 (1, top). Los cubre fallback A en `humanos.resolve_approver` (skip step + RAISE NOTICE).
- Migration: `supabase/migrations/20260428_005_seed_supervisor_ids.sql`.

### Repo (cont.)
- `scripts/copy-sops-to-public.ts` (`acc63f8`): copia los 29 PDFs de SOPs a `public/sops/` con nombres sanitizados + `index.json` mapeando `sop_reference` (ej. `ICRHF0503`) → URL servible. Hook `prebuild` y `predev`. 28 PDFs indexados (uno no matchea regex IC-RH-...).
- `scripts/seed-auth-users.ts` (`07d07f0`): seed idempotente de 6 cuentas auth de prueba (HR team + Rodrigo + Jaime). Password inicial: `TestPass2026!`. Run: `npm run seed:auth-users`. **James debe correrlo después de configurar `.env.local` con `SUPABASE_SERVICE_ROLE_KEY`.**

### [bd] Fase 1 — Funciones Postgres + RLS (Tasks 11-15)
- `humanos.me()`, `humanos.is_hr()`, `humanos.resolve_approver(role, requester_id)`, `humanos.next_request_number()` (`52a3e01`). `resolve_approver` con fallback A: si supervisor_directo es NULL, retorna NULL + RAISE NOTICE.
- `humanos.submit_request(type_code, requester_id, form_data, attachments, chain[])` atómica (`c2f0482`). Saltea steps con approver=NULL.
- `humanos.decide_approval(approval_id, decider_id, decision, comments)` atómica (`37b3388`). Estados: Aprobada/Rechazada/En Revisión.
- Re-seed approval_chain semántico para los 12 tipos (`9f0893b`). ACTUALIZACION_DATOS pasó de requires_approval=false → true.
- Reemplazo de RLS permisiva por policies reales por rol (`880a181`). Writes solo via RPC SECURITY DEFINER o service-role.
