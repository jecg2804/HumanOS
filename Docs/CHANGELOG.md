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

### Fase 2 — Engine wiring (Tasks 16-19)
- `roles.ts` con ROLE_LABEL + `chains.ts` con `effectiveChain` (extiende a Presidencia para PRESTAMO>$250) — commit `84107ee`.
- `submitRequestAction`: invoca RPC + envía email al primer aprobador (`00ab820`).
- `decideApprovalAction`: invoca RPC + email al siguiente aprobador o decisión final al solicitante (`94479c3`).
- `applyActDatosAction`: HR-only, mapea form_data → people (address, phone, marital_status, num_kids); status → Completada (`25a2c02`).

### Fase 3 — 5 forms P1 (Tasks 20-26)
- zod schemas y form registry (`b959cfd`). Adaptado a zod v4 API.
- VacacionesForm + Detail con field array 1-3 rangos (`03a0a6f`).
- AccionPersonalForm + Detail con dropdown de subordinados según rol + callout sobre Hrs Extras post-facto (`713dcc3`). Helper `collectErrorMessages` extraído a `src/lib/forms/error-utils.ts`.
- PrestamoForm + Detail con modal de escalación >$250 — 2 botones reales "Continuar con $X" / "Reducir a $250" citando IC-RH-D-02 (`65460dc`).
- ActualizacionDatosForm + Detail con pre-fill server-side y submit con diff (`08b6387`). `_changes: string[]` en form_data marca campos cambiados.
- ReclamoPagoForm + Detail con tabla 5×3 + auto-cálculo diferencia + upload a Storage `humanos-attachments` (`2817134`). Concerns documentados: path no atado a request_id (UUID temporal cliente), archivos huérfanos al fail submit, signed URL TTL 1 año.
- RequestActions con apply button para HR + decide buttons con dialog (`9f06a95`).

### Fase 4 — Pages (Tasks 27-31)
- `/ayuda` knowledge base agrupada por categoría con SOP links + callout Hrs Extras (`42735eb`).
- `/solicitudes/nueva` grid 12 tipos (P1 link, P2 disabled) (`38484ab`).
- `/solicitudes/nueva/[code]` dynamic route con auto-fill y prefill ACT_DATOS (`b5dd373`).
- `/solicitudes` lista mis + `/solicitudes/[id]` detalle con timeline + RequestList/StatusBadge/Timeline/DetailRenderer + callout "Falta supervisor" cuando base chain incluye `supervisor_directo` pero no hay row con ese role_required (`b2dfefe`).
- `/admin` dashboard server-gated por `me.role === 'hr_admin'` con 4 KPIs reales + tabla filtrable (`f77635f`).

### Fase 5 — Module 1.5 (Tasks 32-33)
- `/directorio` con search por nombre/code/email + filter pills por departamento y oficina (`7d5b4dc`).
- `/perfil` read-only con secciones Identidad/Contacto/Laboral/Otros + CTA a Actualización de Datos (`62b9788`).

### Fase 6 — Wrap-up (Tasks 34-36)
- `Docs/MANUAL_VERIFICATION.md` con 10 secciones / ~22 pasos para verificación end-to-end pre-demo (`d78a828`).
- `Docs/TRAIL.md` actualizado: Module 1 marcado DONE; Module 2 (Expediente) y P2 forms en backlog.

### Notas de implementación importantes
- **typedRoutes desactivado** en `next.config.ts` para permitir redirects dinámicos. Re-evaluar post-MVP.
- **shadcn-ui v4** instalado vía `npx shadcn init -y -d`. components.json apunta a `@/lib/utils` (no a `@/lib/utils/cn` como decía el plan).
- **zod v4** cambió API: `invalid_type_error` no existe; `errorMap` reemplazado por `message` directo en `z.literal`.
- **Resend keys** comentados en `.env.local` por seguridad. James debe descomentarlos antes de probar emails. Helper `sendNotification` no crashea si la key falta — solo log warning.
- **Pre-deploy verificación local OK**: `npm run lint` (5 warnings RHF watch, 0 errors), `npx tsc --noEmit` (clean), `npm run build` (clean).
- **Push pendiente** a `origin/main` para disparar Vercel deploy preview. Requiere permiso explícito de James.

### Fix — URL base de emails resuelta automáticamente

- `src/lib/utils/app-url.ts` nuevo con `getAppUrl()` y `'server-only'` directive. Cascada: `NEXT_PUBLIC_APP_URL` (override manual) → `https://${VERCEL_URL}` (inyectada por Vercel en cada deploy) → `http://localhost:3001` (dev). `src/lib/email/send.ts` reemplazó el `process.env.NEXT_PUBLIC_APP_URL ?? ...` por `getAppUrl()`. Ya no es necesario setear `NEXT_PUBLIC_APP_URL` en Vercel a menos que se quiera fijar un dominio custom (ej. `humanos.iconsa.com.pa`).
