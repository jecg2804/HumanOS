# Auditoria revalidada HumanOS - 2026-06-03

Archivo reemplazado en la raiz del repo segun instruccion del usuario. El nombre conserva la fecha original del archivo para no crear otro artefacto paralelo.

## Scope corregido de esta auditoria

Incluido:

- Setup de desarrollo, gates, hooks, agentes, MCPs documentados, harness y workflow de mantenimiento.
- Document management en sentido de workflow: que los documentos vivos, referencias, baseline y reglas operativas no se contradigan.
- Base de datos como fuente de verdad para estado vivo y reproducibilidad de migraciones.
- Trabajo entregado de Groups 1 y 2: auth, onboarding, employee directory/admin, notificaciones base, tests y build.

Excluido por instruccion del usuario:

- OCR.
- Legal/compliance.
- Producto de document management / knowledge base como feature futura.
- Features claramente planificadas para Groups 3-7, salvo cuando ya fueron aplicadas a BD o docs de setup y generan drift operativo.

## Estado auditado

- Checkout local actual al terminar: `main` en `13a5535`.
- Rama de cambios de Claude Code auditada: `origin/claude/codex-audit-80R3g` en `dd2021e`.
- Esa rama no estaba mergeada en `main` durante esta auditoria.
- CI de GitHub para la rama de Claude Code: workflow `verify` en verde, run de PR `2026-06-03T01:45:55Z`.
- Validacion local en la rama de Claude Code:
  - `npm run typecheck`: pasa.
  - `npm run lint`: pasa.
  - `npm run test`: pasa, 11 archivos de test, 84 tests.
  - `npm run test:e2e`: falla antes de ejecutar tests por env faltante.
  - `npm run build`: pasa cuando se corre separado.
- Supabase MCP no pudo usarse: token expirado con 401.
- Supabase CLI disponible: `supabase` 2.90.0, pero queries/dump directos quedaron bloqueados por pooler/Docker.
- Se valido Storage y PostgREST con `@supabase/supabase-js` usando variables locales.

## Resumen ejecutivo

No aceptaria la rama de Claude Code como "limpia" todavia. Cerro varios hallazgos anteriores de forma correcta, especialmente el bypass de `/forgot-password` y `/reset-password`, los tests de templates de email y el manejo de error al expirar invites. Pero quedan problemas de setup/BD que afectan directamente Groups 1 y 2.

La falla mas importante no es cosmetica: el `SUPABASE_SERVICE_ROLE_KEY` local es valido, pero las rutas server-side que usan PostgREST directo contra schemas no-public reciben `403 permission denied` en tablas centrales de Groups 1 y 2. RLS bypass no sirve si faltan privilegios de tabla/schema. Esto puede romper onboarding, regeneracion de invitaciones, updates de empleados y procesamiento de notificaciones aunque los unit tests pasen.

Ademas, la BD remota ya tiene migraciones `073` y `074` aplicadas, pero `main` no tiene esos archivos. Eso deja la fuente de verdad partida: la base esta adelante del repo principal. Como el usuario esta auditando workflow/setup, esto es P1/P2 aunque parte de la migracion `074` sea de knowledge base futura.

## Hallazgos

### P1 - `service_role` no tiene permisos directos sobre tablas usadas por Groups 1 y 2

**Evidencia**

Las variables locales contienen llaves con forma esperada:

- `SUPABASE_SERVICE_ROLE_KEY`: JWT con role `service_role`, presente.
- `NEXT_SUPABASE_SECRET_KEY`: llave `sb_secret`, presente.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: llave publishable, presente.

Pero consultas directas via PostgREST con `SUPABASE_SERVICE_ROLE_KEY` fallan:

```text
hr.invite_codes: 403 permission denied for table invite_codes
audit.log: 403 permission denied for table log
notifications.outbox: 403 permission denied for table outbox
hr.people: 403 permission denied for table people
hr.employments: 403 permission denied for table employments
```

Tambien fallan tablas de otros schemas:

```text
docs.articles: 403 permission denied for table articles
files.uploads: 403 permission denied for table uploads
requests.tickets: 403 permission denied for table tickets
```

**Superficie afectada**

- `src/lib/onboarding/actions.ts`
  - `validateInviteCodeAction()` lee/actualiza `hr.invite_codes` y lee `hr.people` / `hr.employments`.
  - `reportOnboardingErrorAction()` lee/actualiza `hr.people`, lee `hr.employments` y encola notificaciones.
  - `completeOnboardingAction()` lee `hr.invite_codes`, llama RPCs y luego consulta `hr.people`.
  - `uploadOnboardingAvatarAction()` valida invite y sube a bucket `avatars`.
- `src/lib/admin/employees-actions.ts`
  - `regenerateInviteCodeAction()` actualiza/inserta `hr.invite_codes` e inserta `audit.log`.
  - `updateEmployeeAction()` actualiza `hr.people` y llama `apply_employment_scd2_change`.
- `src/app/api/cron/process-notifications/route.ts`
  - Lee/actualiza `notifications.outbox` y lee `hr.people`.

**Impacto**

Groups 1 y 2 pueden verse "green" por tests mockeados, pero fallar en runtime contra la BD real. Esto invalida el gate de estabilidad para onboarding, admin employees y notificaciones base.

**Recomendacion**

Resolver una de estas dos vias, con diseno explicito:

- Otorgar `USAGE` de schema y privilegios minimos de tabla al role que PostgREST usa para `service_role` en las tablas realmente necesarias.
- O mover writes/reads sensibles a RPCs `SECURITY DEFINER` auditadas y dejar PostgREST directo solo donde haya grants intencionales.

Luego agregar un smoke/live check que pruebe al menos:

- validar invite code,
- regenerar invite,
- update basico de empleado,
- leer/procesar `notifications.outbox`.

### P1 - La BD remota esta adelante de `main` con migraciones 073/074

**Evidencia**

La rama de Claude Code contiene:

- `supabase/migrations/20260603013834_073_fk_covering_indexes_humanos_audit.sql`
- `supabase/migrations/20260603013853_074_docs_published_read_policies.sql`

En `main`, `supabase migration list --linked` muestra esas versiones como aplicadas en remoto pero sin archivo local:

```text
Local          Remote          Time (UTC)
              20260603013834
              20260603013853
```

**Impacto**

La BD ya no es reproducible desde `main`. Cualquier agente o developer que use `main` ve un repo que no describe el estado real de la base. Esto contradice el contrato de `AGENTS.md` / `CLAUDE.md`: BD como fuente de verdad y cambios de schema bajo workflow aprobado.

**Recomendacion**

No dejar este estado intermedio. Hay que reconciliarlo de forma explicita:

- Si las migraciones se aceptan, llevarlas a `main` con el PR correspondiente y actualizar docs/baseline segun el workflow.
- Si alguna no pertenece al scope actual, preparar una migracion correctiva aprobada, no revertir manualmente ni dejar drift silencioso.

### P1 - `npm run verify` sigue fallando localmente

**Evidencia**

En `dd2021e`, `npm run verify` falla en E2E antes de ejecutar pruebas:

```text
Error: E2E_HR_ADMIN_EMAIL / E2E_HR_ADMIN_PASSWORD must be set in .env.local to run the E2E gate locally
    at e2e/auth.setup.ts:22:5
```

El build no llega a ejecutarse dentro de `verify`; solo pasa al correr `npm run build` separado.

**Impacto**

El contrato dice que antes de marcar done corre `npm run verify`. Hoy ese comando no es reproducible sin secretos no documentados en templates. Como CI no corre E2E, puede haber verde en GitHub y rojo local a la vez.

**Recomendacion**

Decidir una politica consistente:

- Si `verify` incluye E2E, documentar y templatear `E2E_HR_ADMIN_EMAIL` / `E2E_HR_ADMIN_PASSWORD`, y asegurar que el usuario sepa como provisionarlos.
- Si E2E no debe ser obligatorio siempre, separar `verify` y `verify:e2e` en docs/CI de forma honesta.
- No marcar done con "verify green" hasta que el comando contractual pase o su contrato se ajuste.

### P2 - El setup de E2E bloquea hasta pruebas publicas

**Evidencia**

`playwright.config.ts` define un proyecto `setup` y hace que `chromium` dependa de ese setup. `e2e/auth.setup.ts` exige credenciales HR admin siempre.

Los templates de env no declaran esas variables:

- `.env.example` no incluye `E2E_HR_ADMIN_EMAIL`.
- `.env.example` no incluye `E2E_HR_ADMIN_PASSWORD`.
- `.env.local.example` tampoco incluye esas variables.

**Impacto**

Pruebas publicas como forgot/reset password quedan bloqueadas por credenciales admin aunque no las necesiten. Esto reduce la utilidad del E2E como harness de regresion para Groups 1 y 2.

**Recomendacion**

Separar proyectos:

- `public` sin dependencia de auth setup.
- `authenticated` con dependency de setup y `storageState`.

O hacer que el setup sea condicional solo para tests que lo requieren.

### P2 - `PROJECT_CONSTITUTION.md` y SessionStart quedaron contradiciendo la referencia actualizada

**Evidencia**

Claude Code actualizo `docs/reference/schemas-permisos.md` para retirar helpers/RPCs inexistentes o mal clasificados. Pero siguen referencias stale en:

- `PROJECT_CONSTITUTION.md`
- `.claude/hooks/session-start.ps1`

Ejemplos que siguen apareciendo:

```text
hr.check_invite_code_rate_limit()
hr.post_leave_ledger_entry()
audit.log_access()
```

**Impacto**

Este es un problema de document management como workflow. `session-start.ps1` se ejecuta para orientar a los agentes y `PROJECT_CONSTITUTION.md` es parte del contrato. Si esos documentos contradicen `docs/reference/schemas-permisos.md`, el siguiente agente puede volver a implementar o auditar contra funciones equivocadas.

**Recomendacion**

Sincronizar los tres artefactos como un mismo paquete:

- `docs/reference/schemas-permisos.md`
- `PROJECT_CONSTITUTION.md`
- `.claude/hooks/session-start.ps1`

Y agregar una regla simple de mantenimiento: cualquier cambio en el inventario de RPC/helpers debe actualizar los tres o dejar una nota explicita de por que no aplica.

### P2 - Se aplico una migracion de knowledge base futura durante un fix de auditoria de setup

**Evidencia**

La migracion `074_docs_published_read_policies` toca politicas de lectura de `docs.*`. Bajo el scope corregido, el producto de document management / knowledge base futura no es tema para cerrar ahora.

La rama tambien actualiza `docs/STATUS.md` con item de KB/read policies, y la BD remota ya tiene la version `20260603013853` aplicada.

**Impacto**

Aunque la migracion puede ser razonable tecnicamente, mezclar feature futura con fixes de auditoria de setup aumenta el riesgo de drift y cambia superficie BD antes de que el grupo correspondiente este en scope.

**Recomendacion**

Tratar esto como decision de workflow:

- Si se queda, documentarlo como excepcion ya aplicada y reconciliarlo en `main`.
- Si se considera fuera de scope, no corregir a mano: crear plan/migracion correctiva aprobada.

### P2 - Baseline/schema snapshot no refleja 073/074

**Evidencia**

Las migraciones 073/074 existen en la rama de Claude Code y estan aplicadas remotamente, pero no aparecen reflejadas en el snapshot bajo `supabase/schemas/`.

Busqueda de elementos de 073/074:

```text
idx_access_log_actor_id
docs_articles_select
```

Resultado: aparecen en migraciones/docs, no en `supabase/schemas/humanos_baseline.sql`.

**Impacto**

El baseline queda menos confiable como documento operativo de BD. Para una auditoria de workflow esto importa, porque el repo tiene varias referencias a schema-first y baseline como fuente de orientacion.

**Recomendacion**

Despues de restaurar acceso estable a BD, regenerar o actualizar el baseline con el procedimiento oficial del repo. No hacerlo manualmente a ciegas.

### P2 - Supabase MCP/SQL operativo no esta confiable para auditorias de BD

**Evidencia**

- Supabase MCP fallo con token expirado:

```text
Provided authentication token is expired. Please try signing in again. status 401
```

- `supabase db query --linked "select 1 as ok"` quedo colgado hasta timeout.
- `supabase db dump --linked -s docs` fallo primero por circuit breaker de auth y luego por dependencia de Docker:

```text
FATAL: (ECIRCUITBREAKER) too many authentication failures
Docker Desktop is a prerequisite for local development
```

**Impacto**

El contrato dice que estado vivo de BD se consulta via Supabase MCP/BD, no duplicando en docs. En esta sesion el canal oficial no estuvo sano, asi que cualquier auditoria profunda de policies/triggers/advisors queda limitada.

**Recomendacion**

Restaurar Supabase MCP auth y documentar un fallback estable para Windows:

- MCP para metadata/advisors cuando este autenticado.
- CLI con conexion que no dispare circuit breaker.
- Evitar `db dump` si Docker no esta disponible, o documentar ese prerequisito.

### P3 - CI verde puede ocultar deuda de seguridad/tooling y E2E

**Evidencia**

La rama de Claude Code tiene CI verde, pero:

- `.github/workflows/verify.yml` no corre E2E.
- `npm audit --audit-level=high` falla localmente con advisories ya conocidos:
  - `path-to-regexp` via `@vercel/config`.
  - `postcss` via `next`.
- En CI, dependency audit esta con `continue-on-error: true`.

**Impacto**

No es un blocker directo de Groups 1/2 si esta aceptado como excepcion temporal, pero el reporte de estado debe seguir diferenciando "CI verde" de "gate completo verde".

**Recomendacion**

Mantener las excepciones documentadas, pero no usar CI verde como reemplazo de `npm run verify` hasta que E2E y audit policy esten alineados.

## Cambios de Claude Code que si cerraron hallazgos previos

### Cerrado - rutas publicas de password reset

`src/lib/auth/constants.ts` incluye:

- `/forgot-password`
- `/reset-password`

Y se agregaron pruebas en:

- `src/lib/auth/constants.test.ts`
- `src/proxy.test.ts`

Los tests unitarios pasan. El build tambien muestra las rutas `/forgot-password` y `/reset-password`.

### Cerrado - templates de email ya no sobreprometen cobertura

`src/lib/notifications/templates.test.ts` cubre templates implementados y deja como `PENDING` los no implementados. Esto evita que docs digan que todos los templates existen cuando no es cierto.

### Cerrado parcial - error al expirar invites anteriores

`regenerateInviteCodeAction()` ahora captura y aborta si falla el update que expira invites anteriores. Eso cierra el bug logico anterior.

Queda pendiente el problema P1 de permisos reales de tabla: aunque el codigo maneje mejor el error, hoy no puede escribir `hr.invite_codes`/`audit.log` via PostgREST directo con la llave probada.

### Cerrado parcial - notas de MCP/namespace

Los agentes `.claude/agents/*` recibieron notas para usar la herramienta Supabase disponible en el runtime actual en vez de asumir nombres exactos de Claude. Eso ayuda a Codex.

Queda pendiente sincronizar listas stale en `PROJECT_CONSTITUTION.md` y `.claude/hooks/session-start.ps1`.

### Validado - buckets Storage

Via Storage API:

```text
attachments: public=false, limit=10485760, mime pdf/jpeg/png/webp/heic/heif, created_at=2026-03-15T20:34:40.460Z
avatars: public=false, limit=5242880, mime jpeg/png/webp, created_at=2026-05-27T19:49:23.748Z
```

La correccion de Claude Code sobre el origen de `attachments` es consistente: `avatars` parece HumanOS/Groups 1-2; `attachments` no debe tratarse como evidencia de document management del producto actual.

## Verificacion ejecutada

Comandos/acciones relevantes:

```text
git fetch origin
git log --oneline --decorate --all -n 20
git diff --name-only main...origin/claude/codex-audit-80R3g
git checkout --detach origin/claude/codex-audit-80R3g
npm run verify
npm run build
npm audit --audit-level=high
supabase migration list --linked
supabase db query --linked "select 1 as ok"
supabase db dump --linked -s docs
node scripts ad-hoc con @supabase/supabase-js para Storage y PostgREST probes
gh run list --limit 8
gh api repos/jecg2804/HumanOS/branches/main/protection
git switch main
supabase migration list --linked
```

## Limitaciones de esta pasada

- No se pudo usar Supabase MCP por token expirado.
- No se pudo inspeccionar `pg_policies`, triggers, grants completos o advisors live por CLI SQL estable.
- No se audito OCR/legal por instruccion expresa.
- No se audito producto futuro de Groups 3-7 salvo drift de workflow/BD.
- No se corrigio codigo ni migraciones; este archivo es reporte de auditoria.

## Recomendacion de cierre

No marcar esta ronda como cerrada todavia. Orden recomendado:

1. Reconciliar el drift BD/repo de migraciones 073/074.
2. Corregir permisos `service_role` o convertir rutas directas a RPCs seguras para los flujos reales de Groups 1/2.
3. Hacer que `npm run verify` sea reproducible o ajustar el contrato/documentacion del gate.
4. Separar E2E publico vs autenticado y documentar variables `E2E_HR_ADMIN_*`.
5. Sincronizar `PROJECT_CONSTITUTION.md`, `.claude/hooks/session-start.ps1` y `docs/reference/schemas-permisos.md`.
6. Restaurar Supabase MCP/auth o documentar fallback BD confiable para auditorias futuras.

Hasta que P1 este resuelto, mi recomendacion es no mergear la rama de Claude Code a `main` como si fuera cierre completo de la auditoria. Si se decide mergear por urgencia, debe hacerse con un follow-up inmediato y explicito para grants/live smoke y drift BD.
