# 0024 — Sistema de docs: reference/ topical + STATUS único + work/_archive (mata el numbering y el desync de estado)

**Fecha:** 2026-06-01 · **Status:** Accepted · **Supersede parcialmente:** ADR-0016 (triple-stack docs).

## Decisión

El set de docs se reorganiza en cuatro ciclos de vida con cuatro hogares:

- **`docs/reference/`** — verdad durable, **nombres topicales sin prefijo numérico**, edit-in-place, nunca se archiva: `vision`, `mvp-scope`, `domain`, `business-rules`, `framework`, `schemas-permisos`, `integrations`, `compliance-ley81`, `toolstack-roadmap`; `README.md` = índice. (Renombrados desde `00-INDEX`/`01..14`.)
- **`docs/adr/`** — decisiones, append-only, IDs inmutables `0001..` (sin cambios).
- **`docs/STATUS.md`** — EL ÚNICO doc mutable de estado (fase + in-flight + blockers + backlog con triggers/gate). Colapsa los 6 docs de estado solapados (`09-ESTADO-ACTUAL`, `DEFERRED-ITEMS`, `AUDITS-PENDING-CONSOLIDATED`, `AUDIT-HANDOFF`, los 2 handoffs). `CHANGELOG.md` = historia append-only.
- **`docs/work/`** (+ `_archive/`) — spec/plan/diseño en construcción; al shippear, su artefacto → `work/_archive/`. `docs/future/` = conocimiento planeado. `docs/superpowers/specs+plans` queda como archivo histórico de specs/plans por grupo.

Arranque de sesión: `CLAUDE.md → STATUS.md` (de ~10 docs a 2); `reference/` se jala just-in-time por el pipeline.

## Contexto

La investigación (Anthropic Claude Code best-practices, OpenAI AGENTS.md, Diátaxis, ADR practice, docs-as-code) y el inventario de ~50 docs mostraron dos fuentes de dolor: (1) **6 docs de "estado" solapados** que duplicaban el mismo backlog/snapshot y se desincronizaban entre sí y con el CHANGELOG; (2) **prefijos numéricos `00-14`** que codifican un orden que el agente no consume linealmente y que rompen cross-refs e historia cada vez que se inserta/borra/renumera un doc. El arranque costaba ~8-10 docs.

## Alternativas rechazadas

- **Mantener la numeración 00-14** — el orden numérico no aporta (el agente navega por tópico, no secuencial) y renumerar es la fuente real de desync. Rechazado.
- **Triple-stack por audiencia (ADR-0016)** — "docs para Chat vs docs para Code". En la práctica todos leen el mismo set; el split añadía mantenimiento sin valor. Superado: un solo set.
- **Varios docs de estado** (snapshot + deferred + audits) — cada uno reintroducía drift. Rechazado: un único `STATUS.md`.
- **Migrar `superpowers/specs+plans` a `work/_archive` ahora** — alta churn, bajo valor (son artefactos estables que no causaban el sprawl). Diferido: quedan como archivo histórico; `work/` es el hogar de specs/plans nuevos en construcción.

## Riesgos / mitigaciones

- **Cross-refs rotos por el rename** — mitigado: mapa de referencias inbound completo + grep de verificación post-migración (cero referencias huérfanas a los nombres viejos).
- **Re-aparición de un 2.º doc de estado** — mitigado por regla explícita en `reference/framework.md` + `reference/README.md` + los pre-flight de los SKILL bodies (todos apuntan el gate del backlog a `STATUS.md`).
- **Enforcement** — el sistema es human-enforced (no hay hook que lo garantice); el framing en framework.md/README + el gate de `grill-with-docs` lo sostienen. No se afirma "enforced" en ningún doc.

## Consecuencias

- `@imports` de `CLAUDE.md` y referencias en `PROJECT_CONSTITUTION.md`, hooks `.ps1`, skills, `src/app/globals.css`, `docs/future/*`, `docs/sops/README.md` repuntados a las rutas topicales / a `STATUS.md`.
- El gate no-saltable del pipeline (antes en `DEFERRED-ITEMS.md`) ahora vive en `STATUS.md` §Backlog y es referenciado por los SKILL bodies de `iconsa-form-implementation` e `iconsa-supabase-migration`.
