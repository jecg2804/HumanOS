# 00-INDEX.md — Índice de docs HumanOS

**Role:** mapa de navegación del set de docs (qué doc es qué, dónde vive) — single source de estructura. · **Read-when:** al orientarte en `docs/` o buscar dónde vive un tema. · **Maintain-when:** se crea/mueve/mergea/renombra un doc.

**Última actualización**: 2026-06-01 (restructure: single doc set, `docs/future/`, merges 03→02 / 10→06, split 13)

---

## Un solo set de docs

`docs/` es **un solo conjunto de docs numerados** que sirve a todos los lectores (implementer y reviewer por igual) — NO hay separación "docs para Chat vs docs para Code". La BD (vía Supabase MCP) es la fuente de verdad para estado vivo (counts, migrations, rows); los docs documentan modelo, decisiones y dominio, no inventario.

Cada doc lleva un header de 3 líneas (**Role / Read-when / Maintain-when**) que dice qué es, cuándo leerlo y cuándo mantenerlo.

---

## Índice de docs

| # | Archivo | Resumen |
|---|---|---|
| 00 | [00-INDEX.md](00-INDEX.md) | Este índice |
| 01 | [01-VISION.md](01-VISION.md) | Misión HumanOS, north star, anti-decisiones |
| 02 | [02-MVP-SCOPE.md](02-MVP-SCOPE.md) | 39 features F1-F39 + engines + modes + **roadmap post-MVP** (absorbió 03) |
| 03 | [03-ROADMAP-POST-MVP.md](03-ROADMAP-POST-MVP.md) | **Stub** → fusionado en 02 |
| 04 | [04-DOMAIN-RRHH.md](04-DOMAIN-RRHH.md) | Dominio RRHH ICONSA: SOPs, formularios, equipo, type→mode mapping |
| 05 | [05-BUSINESS-RULES.md](05-BUSINESS-RULES.md) | R1-R27 reglas críticas. Code DEBE seguir |
| 06 | [06-FRAMEWORK-CLAUDE-CODE.md](06-FRAMEWORK-CLAUDE-CODE.md) | Setup Code + workflow + harness + **handoff protocol** (absorbió 10) |
| 07 | [07-SCHEMAS-PERMISOS.md](07-SCHEMAS-PERMISOS.md) | Qué schemas tocar, RLS conventions, helpers |
| 08 | [adr/README.md](adr/README.md) | ADRs: ledger canónico único en `docs/adr/`. 08-ADRs.md fusionado 2026-06-01 |
| 09 | [09-ESTADO-ACTUAL.md](09-ESTADO-ACTUAL.md) | Snapshot live (fase + in-flight + blockers + decisiones humanas). Volátil |
| 10 | [10-HANDOFF-PROTOCOL.md](10-HANDOFF-PROTOCOL.md) | **Stub** → fusionado en 06 |
| 14 | [14-COMPLIANCE-LEY81.md](14-COMPLIANCE-LEY81.md) | Compliance Ley 81/2019 (R27). DRAFT legal |

**Auxiliares en `docs/`**:

- [CONTEXT.md](CONTEXT.md) — vocabulario vivo, mantenido vía grill-with-docs
- [CHANGELOG.md](CHANGELOG.md) — entries por feature implementada (semver tags)
- `HANDOFF.json` — generado por hook `PreCompact` (gitignored, ephemeral)
- `DEFERRED-ITEMS.md`, `AUDITS-PENDING-CONSOLIDATED-*.md`, `AUDIT-HANDOFF-*.md` — tracking

**Sub-folders en `docs/`**:

- [adr/](adr/) — **ledger canónico único de ADRs** (Code-generated vía grill-with-docs; ver `adr/README.md` para el índice + mapa legacy→canónico)
- [future/](future/) — docs foundational/aspiracional (no operacionales hoy):
  - `future/11-MDM-PRINCIPLES.md` — Master Data Management, golden records, lineage
  - `future/12-SOR-MATRIX.md` — System-of-Record por entidad cross-app
  - `future/13-INTEGRATIONS-PLANNED.md` — integraciones ETL/master data planned + apps futuras
- [sops/](sops/) — SOPs en PDF + markdown extraído (leer vía Filesystem MCP)
- `superpowers/specs/` + `superpowers/plans/` — specs y planes Code-generated

**Infraestructura LIVE**: [13-INTEGRATIONS-INDEX.md](13-INTEGRATIONS-INDEX.md) — email/cron/hosting/monitoring + apps internas en producción (el catálogo planned/ETL se movió a `future/13-INTEGRATIONS-PLANNED.md`).

---

## Read-cadence (qué leer y cuándo)

- **Al abrir sesión**: `09-ESTADO-ACTUAL.md` (fase + blockers) → `CLAUDE.md` raíz (reglas + @imports).
- **Estado real de BD**: Supabase MCP (NO confiar en counts en docs).
- **Reglas de negocio / decisiones técnicas**: `05-BUSINESS-RULES.md` + `07-SCHEMAS-PERMISOS.md`.
- **Implementar una feature**: `04-DOMAIN-RRHH.md` + skill `iconsa-form-implementation` (field matrix).
- **Vocabulario en duda**: `CONTEXT.md`.
- **Decisiones pasadas**: `adr/README.md` + `adr/*.md`.
- **SOP de un formulario**: `sops/*.pdf` vía Filesystem MCP (NO Google Drive).
- **Bootstrap invite codes**: tabla en `06-FRAMEWORK-CLAUDE-CODE.md` (sección Handoff protocol).

---

## Versionado

Docs NO usan semver propio. Cada doc tiene "Última actualización" en header. Cambios mayores se reflejan en [CHANGELOG.md](CHANGELOG.md) con la versión del repo en que se commitearon.

Repo sigue semver tags: v0.0.1 (Group 1 Foundation), v0.0.2 (Group 2 Onboarding), v0.0.3+ próximos.
