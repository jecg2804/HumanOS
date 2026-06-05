# 0033 — Excepción autorizada: build nocturno dirigido por consejo de agentes (override puntual de ADR-0026)

**Fecha:** 2026-06-05 · **Status:** Accepted · **Decidido por:** Jaime (autorización explícita en sesión). **Override puntual de:** ADR-0026 (modelo atendido) + Constitution §5.6. **Refuerza (no relaja):** R1 (schemas prohibidos), R22 (auth.users), R23 (encoding), R27 (Ley 81), ADR-0006 (service-role).

## Decisión

Excepción **puntual y acotada a la noche del 2026-06-05**: Code ejecuta un build dirigido por un **consejo de agentes adversarial** en lugar del diseño atendido que exige ADR-0026. El consejo (research + lentes múltiples + R1-R27 + Ley 81, con verificación *refute-by-default*) sustituye el juicio de diseño de Jaime **solo en decisiones técnicas y reversibles**. Jaime revisa y prueba en la mañana.

**Boundaries no negociables (hooks intactos):**
- DB **additive-only** + snapshot a `backup.*` antes de cualquier escritura de datos; **solo schemas HumanOS** (`hr/requests/docs/workflows/audit/notifications/files/performance/learning/payroll/core/raw_spectrum/meta`).
- **NUNCA** `public.*` / `humanos.*`; **NUNCA** ops destructivas en `auth.users` ni en identidad de `hr.people`; **NO** cambiar hooks/`settings.json` ni Exposed Schemas; **NO** deploy a prod; **NO** habilitar el cron SDX (pendiente confirmación de auth con el vendor).
- Trabajo en branch `overnight/mvp-build-2026-06-05`; **`main` queda como restore point** (tag `pre-overnight-2026-06-05`).
- **Aplicación de migraciones centralizada en el main loop (Code)**, tras `migration-reviewer` + `rls-reviewer`. Los sub-agentes **escriben** SQL; **no lo aplican**.

**Reversibilidad (declarada explícitamente):** repo = git, reversible a cualquier commit/tag. **DB = additive + snapshot ⇒ reversible *en práctica* vía migración compensatoria, NO un `git reset`** — por eso las migraciones se mantienen mínimas y aditivas.

**No-deferral (Jaime duerme ~7h):** el consejo **NO bloquea ni espera a Jaime**. En cada fork toma la mejor decisión fundamentada (evidencia + research + R1-R27), la **registra como assumption/ADR** y **sigue**. Jaime revisa los assumptions en la mañana y revierte lo que no le guste (branch + tag + snapshots lo permiten). Throughput objetivo: **churn de grupos MVP**, no gold-plating de un slice.

**Verdad de dominio = se LEE, no se difiere.** Las cadenas SOP (R9/R26) se **leen de la SOR** (GDrive `RECURSOS HUMANOS` vía conector + catálogo validado `docs/work/2026-06-03-hr-catalog-and-launch-plan.md`) y se implementan **con fidelidad**; desviaciones/ambigüedades genuinas se implementan con la interpretación más fiel + se loguean como assumption (no se bloquea). `Employment_Status` A/C/S: default razonado (A=activo; C/S=no-activo ⇒ flag) + assumption logueado.

**Hard-stops = solo boundaries de seguridad (no decisiones):** `public.*`/`humanos.*`, destructive `auth.users`/`hr.people`, hooks/`settings`/Exposed-Schemas, deploy prod, habilitar cron SDX (vendor auth). Esos no se tocan — no porque falte input de Jaime, sino porque son acciones fuera de límites.

## Contexto

Jaime pidió explícitamente un overnight build del MVP como excepción, aceptando revisar/testear en la mañana y con capacidad de rollback. ADR-0026 retiró "overnight autónomo" como default por falta de readiness (revisor independiente cross-model, E2E completo, gate de merge bloqueante). Esta excepción **mitiga** esos gaps con el consejo adversarial + `npm run verify` + review multi-agente, pero reconoce que el diseño atendido sigue siendo el modelo por defecto una vez terminada la noche.

## Consecuencias

- Post-noche el modelo **vuelve a ADR-0026** (atendido). Esta excepción **no lo supersede**; lo suspende una vez.
- Cada slice entregado: spec/ADR + plan + build + review adversarial + `verify` verde + docs vivos (CHANGELOG/STATUS/CONTEXT/ADR) en el **mismo commit**.
- Charter operativo + log de progreso (= morning report): `docs/work/2026-06-05-overnight-build-charter.md`.
- Riesgo aceptado por Jaime: decisiones de diseño tomadas por el consejo (no por él) en el scope técnico; mitigado por reversibilidad (branch + tag + snapshots) + review matinal + boundaries que protegen MovimientOS prod.

## Alternativas rechazadas

- **Mantener ADR-0026 estricto (rechazar el overnight)** — Jaime lo autorizó explícitamente; es su decisión de owner.
- **Que el consejo decida TODO, incl. dominio/SOP** — viola R9/R26; el consejo no puede verificar SOPs ni hechos de vendor ⇒ esos se difieren.
- **Aplicar migraciones desde sub-agentes** — se centraliza en el main loop como checkpoint equivalente-a-humano sobre cada mutación de la BD compartida.
