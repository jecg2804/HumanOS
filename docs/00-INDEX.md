# 00-INDEX.md — Indice de Project Files HumanOS v2

**Ultima actualizacion**: 2026-05-29 (post-auditoria 2026-05-29 + pivot a estrategia forms-first — ver 02-MVP-SCOPE.md status)

---

## Filosofia triple stack

| Stack | Audiencia | Proposito | Tamano |
|---|---|---|---|
| **Project Files (Chat)** | Claude Chat memory | Strategy, decisiones, roadmap, dominio extenso | 14 docs numerados + CONTEXT + CHANGELOG + HANDOFF |
| **`docs/` repo (numerado)** | Claude Code operativo + Chat audit | Single source de verdad. Code lee al implementar | Mismos archivos vivos en repo |
| **`iconsa-knowledge` wiki** (futuro) | Humano + ambos Claudes | Knowledge base operacional reusable cross-app | v1.1 |

**Nota**: Originalmente se planeo separar Project Files (Chat) de repo docs (Code) con nombres distintos (`business-rules.md`, `schemas-permisos.md`, etc.). La realidad converge: un solo set de docs numerados vive en `docs/` y sirve a ambas audiencias. Esta convergencia es intencional — un solo sitio que actualizar.

---

## Indice de docs (14 numerados + 3 auxiliares)

| # | Archivo | Resumen |
|---|---|---|
| 00 | [00-INDEX.md](00-INDEX.md) | Este indice |
| 01 | [01-VISION.md](01-VISION.md) | Mision HumanOS, north star, anti-decisiones |
| 02 | [02-MVP-SCOPE.md](02-MVP-SCOPE.md) | 39 features F1-F39 con engines, modes, mapping per SOP |
| 03 | [03-ROADMAP-POST-MVP.md](03-ROADMAP-POST-MVP.md) | Que viene post-overnight #1: v1.1, v2 |
| 04 | [04-DOMAIN-RRHH.md](04-DOMAIN-RRHH.md) | Dominio RRHH ICONSA: SOPs, formularios, equipo, modes |
| 05 | [05-BUSINESS-RULES.md](05-BUSINESS-RULES.md) | R1-R26 reglas criticas. Code DEBE seguir |
| 06 | [06-FRAMEWORK-CLAUDE-CODE.md](06-FRAMEWORK-CLAUDE-CODE.md) | Setup Code + workflow grill-with-docs + harness |
| 07 | [07-SCHEMAS-PERMISOS.md](07-SCHEMAS-PERMISOS.md) | Que schemas tocar, RLS conventions, helpers |
| 08 | [08-ADRs.md](08-ADRs.md) | Decisiones tecnicas Chat-level (ADR-0001 a ADR-0014) |
| 09 | [09-ESTADO-ACTUAL.md](09-ESTADO-ACTUAL.md) | Snapshot live BD + sesion actual (volatil) |
| 10 | [10-HANDOFF-PROTOCOL.md](10-HANDOFF-PROTOCOL.md) | Como Chat-Code-James intercambian estado |
| 11 | [11-MDM-PRINCIPLES.md](11-MDM-PRINCIPLES.md) | Master Data Management — golden records, lineage |
| 12 | [12-SOR-MATRIX.md](12-SOR-MATRIX.md) | System-of-Record por entidad cross-app |
| 13 | [13-INTEGRATIONS-INDEX.md](13-INTEGRATIONS-INDEX.md) | Catalogo integraciones ICONSA (infraestructura + ETL) |

**Auxiliares en `docs/`**:

- [CONTEXT.md](CONTEXT.md) — vocabulario vivo, mantenido por Code via grill-with-docs
- [CHANGELOG.md](CHANGELOG.md) — entries por feature implementada (semver tags)
- `HANDOFF.json` — generado por hook `PreCompact` (gitignored desde 2026-05-28, ephemeral)

**Sub-folders en `docs/`**:

- [adr/](adr/) — ADRs Code-level (0001-0008 hasta hoy) generados durante implementacion
- [sops/](sops/) — SOPs descargados de GDrive en PDF + markdown extraido cuando aplica
- `superpowers/plans/` — planes Code-generated durante writing-plans skill (untracked en algunos casos)

---

## Como se usa este stack

### Para Chat (Claude memory)

1. Lee [00-INDEX.md](00-INDEX.md) -> [09-ESTADO-ACTUAL.md](09-ESTADO-ACTUAL.md) para snapshot rapido
2. Lee [02-MVP-SCOPE.md](02-MVP-SCOPE.md) + [04-DOMAIN-RRHH.md](04-DOMAIN-RRHH.md) para contexto producto
3. Lee [06-FRAMEWORK-CLAUDE-CODE.md](06-FRAMEWORK-CLAUDE-CODE.md) + [10-HANDOFF-PROTOCOL.md](10-HANDOFF-PROTOCOL.md) para workflow Code

### Para Code (sesion grill-with-docs y overnight)

1. Lee `CLAUDE.md` raiz (entry)
2. Sigue @imports condicionales segun tarea
3. Para decisiones tecnicas durante implementacion: consulta [05-BUSINESS-RULES.md](05-BUSINESS-RULES.md) + [07-SCHEMAS-PERMISOS.md](07-SCHEMAS-PERMISOS.md)
4. Para implementar una feature: consulta [04-DOMAIN-RRHH.md](04-DOMAIN-RRHH.md) + skill `iconsa-form-implementation` para field matrix
5. Si necesita SOP: lee `docs/sops/*.pdf` directamente (Filesystem MCP, NO Google Drive)
6. Documenta decisiones nuevas en `docs/adr/`
7. Mantiene [CONTEXT.md](CONTEXT.md) con vocabulario vivo

### Para James

- Project Files (estos numerados): vivien en repo + Chat los lee paste al inicio de cada sesion
- Repo commits: Code los toca cuando implementa; Chat los toca cuando decide
- Invite codes bootstrap: entregar personalmente a Samantha, Rocio, Milagros, Jerelyn, Rodrigo, Javier Ferrer

---

## Versionado

Docs NO usan semver propio. Cada doc tiene "Ultima actualizacion" en header. Cambios mayores se reflejan en [CHANGELOG.md](CHANGELOG.md) con la version del repo en la que se commitearon.

Repo sigue semver tags: v0.0.1 (Group 1 Foundation), v0.0.2 (Group 2 Onboarding), v0.0.3+ proximos.
