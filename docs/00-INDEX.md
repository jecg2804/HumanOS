# 00-INDEX.md — Índice de Project Files HumanOS v2

**Última actualización**: sesión 2026-05-27 (post-migrations BD + decisiones finales scope + 39 features + R26 SOP-driven)

---

## Filosofía triple stack

| Stack | Audiencia | Propósito | Tamaño |
|---|---|---|---|
| **Project Files (Chat)** | Claude Chat memory | Strategy, decisiones, roadmap, dominio extenso | 14 archivos |
| **`docs/` repo** | Claude Code operativo | Lo que Code necesita para implementar | 5 archivos core |
| **`iconsa-knowledge` wiki** (futuro) | Humano + ambos Claudes | Knowledge base operacional reusable cross-app | v1.1 |

---

## Project Files (este folder, 10 docs)

| # | Archivo | Resumen |
|---|---|---|
| 00 | 00-INDEX.md | Este índice |
| 01 | 01-VISION.md | Misión HumanOS, north star, decisiones grandes, anti-decisiones |
| 02 | 02-MVP-SCOPE.md | 39 features F1-F39 con engines, modes, mapping per SOP |
| 03 | 03-ROADMAP-POST-MVP.md | Qué viene post-overnight #1: v1.1, v2 |
| 04 | 04-DOMAIN-RRHH.md | Dominio RRHH ICONSA: SOPs, formularios, equipo, modes |
| 06 | 06-FRAMEWORK-CLAUDE-CODE.md | Setup Code + workflow grill-with-docs + harness |
| 08 | 08-ADRs.md | Decisiones técnicas archivadas (ADR-0001 a ADR-0013) |
| 09 | 09-ESTADO-ACTUAL.md | Snapshot live BD + sesión actual (volátil) |
| 10 | 10-HANDOFF-PROTOCOL.md | Cómo Chat-Code-James intercambian estado |

---

## Repo docs (`docs/` folder en HumanOS repo, 5 archivos core)

| Archivo | Resumen |
|---|---|
| `CLAUDE.md` (raíz) | ≤4.3KB minimal entry point. @imports condicionales |
| `docs/business-rules.md` | R1-R26 reglas críticas. Code DEBE seguir |
| `docs/schemas-permisos.md` | Qué schemas tocar, RLS conventions, helpers |
| `docs/iconsa-knowledge.md` | Dominio ICONSA condensado para Code |
| `docs/form-catalog.md` | Catálogo 24 form variants con form_schema + chain |

Additionally en repo:
- `docs/CONTEXT.md` — vocabulary vivo, mantenido por Code via grill-with-docs
- `docs/CHANGELOG.md` — entries por feature implementada
- `docs/ROADMAP.md` — pendiente reflejado por Code
- `docs/adr/` — ADRs técnicos generados por Code durante implementación
- `docs/sops/*.pdf` + `*.md` — SOPs descargados de GDrive + markdown extraído

---

## Cómo se usa este stack

### Para Chat (Claude memory)
1. Lee 00-INDEX → 09-ESTADO-ACTUAL para snapshot rápido
2. Lee 02-MVP-SCOPE + 04-DOMAIN para contexto producto
3. Lee 06-FRAMEWORK + 10-HANDOFF para workflow Code

### Para Code (sesión grill-with-docs y overnight)
1. Lee `CLAUDE.md` raíz (entry)
2. Sigue @imports condicionales según tarea
3. Para decisiones técnicas durante implementación: consulta `docs/business-rules.md` + `docs/schemas-permisos.md`
4. Para implementar una feature: consulta `docs/form-catalog.md` + `docs/iconsa-knowledge.md`
5. Si necesita SOP: lee `docs/sops/*.md`
6. Documenta decisiones nuevas en `docs/adr/`
7. Mantiene `docs/CONTEXT.md` con vocabulario vivo

### Para James
- Project Files (este folder): paste a Chat al inicio de cada sesión Chat
- Repo docs: commit al repo, Code los lee automáticamente
- Invite codes bootstrap: entregar personalmente a Samantha, Rocío, Milagros, Jerelyn, Rodrigo, Javier Ferrer

---

## Triple stack decisión consciente

**Por qué tres lugares?**
- **Chat memory** necesita strategy/decisiones que Chat referencia en cada sesión
- **Repo docs** necesita reglas operativas que Code lee al programar
- **Wiki futuro** será single source of truth cross-app cuando dos+ apps converjan

Mantener sync: Chat actualiza Project Files cuando decide cosas grandes. Code actualiza repo docs cuando implementa. James pega Project Files al Chat de sesiones nuevas y commit repo docs.

---

## Versionado

Project Files NO usan semver. Cada doc tiene "Última actualización" en header. Cambios mayores se notan en commit message Chat → James.

Repo docs siguen el versionado del repo (commits + tags).
