# Deferred Items Registry — enganche, no olvido

**Propósito.** Cada ítem de auditoría/diseño que se difiere a "un grupo o momento futuro" vive
AQUÍ con un **trigger explícito** (cuándo debe reaparecer) y un **gate** (qué fase del pipeline lo
consume). Esto convierte "diferido a Group 4" en algo enganchado a un evento concreto, no una nota
que nadie relee.

**Gate (no-saltable).** En el pipeline canónico (ver `CLAUDE.md` §Workflow), el paso
`grill-with-docs` + `writing-plans` de CADA grupo/feature **DEBE** leer este archivo, filtrar por el
grupo y por los schemas/tablas que el plan va a tocar, y para cada ítem que matchee: (a) incluirlo en
el plan como tarea, o (b) re-diferirlo explícitamente con razón. No se permite arrancar el plan sin
resolver los matches. Los skills `iconsa-form-implementation` y `iconsa-supabase-migration` también
apuntan aquí.

**Mantenimiento.** Cuando un ítem se completa, se mueve a la sección "Resueltos" con el commit. Cuando
se difiere uno nuevo, se agrega con trigger + gate. El CHANGELOG referencia, no duplica.

---

## Abiertos

### Trigger: GROUP 4 (engines + tickets + primer form)

| ID | Ítem | Por qué se difirió | Qué hacer al entrar |
|----|------|--------------------|---------------------|
| DB-1 | Audit triggers `SECURITY DEFINER` que reemplazan el write app-level de auditoría | Cambio arquitectónico acoplado al ApprovalEngine; hacerlo aislado arriesga re-trabajo | Al diseñar el ApprovalEngine, decidir trigger-based vs app-level audit y migrarlo en el mismo ADR/plan |
| seq-reset | `requests.next_sequence` reset por año (hoy contador monotónico) | Decisión de formato/SOP no confirmada | Al cablear creación de tickets: validar con el SOP si `HUM-2027-0001` debe resetear; si sí, ajustar la función |
| BL-2..7 | Capturar decisiones de approval-chain en `docs/adr/0020-approval-chain-template-jsonb-modes.md` (BL-2 ya decidido ahí; BL-3..7 pendientes) | Dependen de James/Samantha | Antes de construir los forms president-gated, cerrar BL-3..7 y capturarlas |

### Trigger: GROUP 3 — diseño de signup/login (perfil + directorio)

Fuente: `docs/superpowers/specs/2026-06-01-signup-advisory.md` (mini-auditoría 2026-06-01, 3/3 refutaron la versión ingenua). Brainstorm de signup DEBE consumir el advisory.

| ID | Ítem | Nota |
|----|------|------|
| SIGNUP-premise | La fórmula "3 letras apellido + 3 dígitos cédula" **no se sostiene en la data** (~84-90%, dígitos intercambiados; solo 14% tiene cédula; no hay columna apellido) | James: validar la regla real de Spectrum. Código se ESPEJA o se GENERA local, no se computa de cédula |
| SIGNUP-guardrails | 11 reglas de seguridad no-negociables (identificador adivinable = username, nunca credencial; factor de posesión out-of-band siempre; respuestas no-enumerantes; rate-limit (identifier,IP); reset solo por email on-record; merge cross-app gated) | En el advisory §4 |
| SIGNUP-datamodel | Pre-requisitos: `national_id` UNIQUE + CHECK DGI; link integridad `employee_code`↔`person_sources`; índice único CI en `employee_code` | Antes de que cédula/code sean load-bearing |
| SIGNUP-session-bug | `completeOnboardingAction` aprovisiona pero NO crea sesión → rebota a /login | Arreglar al construir signup |
| SIGNUP-phone | Onboarding mintea `auth.users` por teléfono pero login es email-only → cuentas no-logueables | Resolver o deprecar phone-as-identifier |

### Trigger: TOCAR tablas existentes `hr.*`/`requests.*` (idealmente temprano en Group 3/4)

| ID | Ítem | Por qué se difirió | Qué hacer |
|----|------|--------------------|-----------|
| DB-VISION-B | Retrofit de **soft-delete** (`deleted_at` + "no hard deletes"), `source_system`, columnas de **sync/offline** (client-uuid, updated_at server-authoritative), y bake `AND deleted_at IS NULL` en las RLS de las tablas `hr.*`/`requests.*` EXISTENTES | Altera RLS de tablas con data → más riesgo que tablas nuevas (047 solo cubrió las nuevas) | Brainstorm+grill dedicado: diseñar el retrofit como migración por tabla con validación RLS (rls-reviewer) antes de mobile/offline. **Es el gap real de "future vision readiness".** |
| DB-VISION-C | Columnas de compensación, custom-fields (EAV/JSONB), y completar performance/learning para la visión | YAGNI hasta que la feature los justifique | Diseñar con la feature que los consume (Groups 5-7), no especular ahora |

### Trigger: construir features sobre `learning.*` / `performance.*` / `workflows.*` (Groups 5-7)

| ID | Ítem | Por qué se difirió | Qué hacer |
|----|------|--------------------|-----------|
| ~~P2.24-bulk~~ | ✅ HECHO 2026-06-01 (`052`+`053`): todas las columnas de los 9 schemas tienen COMMENT (gap=0/879). Cuando una feature de Groups 5-7 refine semántica de una columna, actualiza su comment en la misma migración | — | — |

### Trigger: pasada dedicada de DOCS (ver `docs/superpowers/specs/2026-06-01-docs-restructure-plan.md`)

| ID | Ítem | Estado |
|----|------|--------|
| D1 | Kill el split por audiencia (00-INDEX triple-stack, headers Owner/Audiencia, Constitution §7) | Abierto |
| D2-merge | Renumber físico de los 14 ADR legacy a una sola secuencia + borrar 08-ADRs | ✅ Hecho 2026-06-01 (14 entradas → `docs/adr/0010-0023`; 08-ADRs.md borrado; cross-refs repointed; mapa legacy→canónico en `docs/adr/README.md`) |
| D3 | Merge 03→02, 10→06, 04→CONTEXT.md | Abierto |
| D4 | Header de 3 líneas (Role/Read-when/Maintain-when) por doc | Abierto |
| D5 | Slim 09-ESTADO-ACTUAL a ~1 pantalla | Abierto |
| D6-slim | Quitar de CLAUDE.md el bloque de tokens completo + prosa mental-model (ya <200 líneas: 147) | Parcial (conteo de tests ya corregido) |
| D7-demote | Mover 11-MDM + 12-SOR a `docs/future/` | Abierto (naming person_sources ya corregido) |
| D8 | Split 13-INTEGRATIONS por status (LIVE vs planned/ETL) | Abierto |
| D10-DOC4 | 07-SCHEMAS-PERMISOS stale (fechado 2026-05-27, counts viejos) | Abierto |
| 06-stale | 06-FRAMEWORK aún tiene la tabla "Workflow correcto" + "Overnight phases" viejas que contradicen el pipeline v2 | Parcial (secciones MCP/subagents ya sincronizadas) |

### Trigger: pasada dedicada de A11Y / MOBILE

| ID | Ítem | Estado |
|----|------|--------|
| FE-3-full | a11y comprehensivo (keyboard nav completo, contraste, ARIA en todo interactivo) — hoy solo modal + role=alert | Baseline hecho |
| FE-4-pwa | Íconos PWA + offline real (service worker) — hoy solo manifest + viewport | Baseline hecho; íconos necesitan assets (James) |

---

## Resueltos (referencia; no re-trabajar)

- Ver `docs/AUDITS-PENDING-CONSOLIDATED-2026-05-29.md` §0.5 (sesión 2026-06-01) y §9.
