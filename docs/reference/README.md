# docs/ — índice y sistema de documentación

**Role:** mapa de navegación de los docs HumanOS + las reglas de mantenimiento. · **Read-when:** cuando dudes dónde vive algo o dónde escribir. · **Maintain-when:** cambia la estructura de docs (entonces también `framework.md` + un ADR).

Arranque de sesión: **`CLAUDE.md` (raíz) → `docs/STATUS.md`**. El pipeline jala los docs de `reference/` *just-in-time* (solo el relevante al feature). De ~10 docs de arranque → 2.

## Cuatro ciclos de vida, cuatro hogares (ADR-0024)

| Hogar | Qué | Mutabilidad |
|---|---|---|
| `reference/` | VERDAD DURABLE (nombres topicales, sin números) | **edit-in-place**, nunca se archiva |
| `adr/` | DECISIONES (IDs `0001..`) | **append-only**; superada → `Superseded` + nuevo ADR |
| `STATUS.md` | EL ÚNICO doc de estado (fase + in-flight + blockers + backlog con triggers/gate) | mutable; **no hay 2.º doc de estado** |
| `CHANGELOG.md` | historia de cambios | append-only |
| `work/` (+ `_archive/`) | spec/plan/diseño en construcción → archivar al shippear | transitorio |
| `future/` | conocimiento PLANEADO, no operacional | edit cuando madure |
| `superpowers/specs+plans` | specs/plans históricos por grupo | archivo |
| `sops/` | PDFs fuente de los formularios papel | fuente externa |

## Reference docs (verdad durable)

| Doc | Contenido |
|---|---|
| [vision.md](vision.md) | Misión, north star, decisiones grandes (no-reabrir), anti-decisiones |
| [mvp-scope.md](mvp-scope.md) | Features F1-F39 + engines E1-E6 + 24 type→mode mapping + status + roadmap post-MVP |
| [domain.md](domain.md) | Dominio RRHH ICONSA: SOPs, formularios, equipo, type→mode mapping |
| [business-rules.md](business-rules.md) | R1-R27 reglas críticas. Code DEBE seguir (enforcement por hooks + skill) |
| [framework.md](framework.md) | Setup Claude Code + pipeline + hooks + sistema de docs + handoff protocol |
| [schemas-permisos.md](schemas-permisos.md) | Qué schemas tocar, RLS conventions, helper functions |
| [integrations.md](integrations.md) | Infraestructura LIVE ICONSA (Resend/Sentry/Vercel/Supabase). Planned/ETL → `../future/13-INTEGRATIONS-PLANNED.md` |
| [compliance-ley81.md](compliance-ley81.md) | Cumplimiento Ley 81/2019 (R27). DRAFT pendiente revisión legal |
| [toolstack-roadmap.md](toolstack-roadmap.md) | Roadmap de herramientas/servicios por fase (paridad líderes de mercado) |
| [security-dependency-exceptions.md](security-dependency-exceptions.md) | Excepciones de `npm audit` aceptadas (sin fix no-breaking) + triggers de retiro (W3 SEC-DEPS) |

## Estado, decisiones, vocabulario

- **Estado vivo / backlog / blockers:** [../STATUS.md](../STATUS.md) — el único doc de estado.
- **Decisiones arquitectónicas:** [../adr/README.md](../adr/README.md) (índice canónico, ADRs `0001..`).
- **Vocabulario:** [../CONTEXT.md](../CONTEXT.md) (glosario vivo, mantenido vía `grill-with-docs`).
- **Historia:** [../CHANGELOG.md](../CHANGELOG.md) (append-only).
- **Conocimiento aspiracional:** [../future/](../future/) (MDM, SOR matrix, integraciones planned).

## Conteos vivos = BD, no docs

Personas, tickets, invite codes sin consumir, número de tests, migraciones aplicadas, roles: la **BD (Supabase MCP)** y **CI** son la fuente de verdad. Los docs NO duplican esos conteos (se desactualizan). Ver `CLAUDE.md` para la regla.

## Reglas de mantenimiento

- `reference/` siempre vigente, edit-in-place, sin fechas "as of", nunca se archiva.
- `adr/` append-only; una decisión superada se marca `Superseded` + nuevo ADR (no se edita la vieja).
- `STATUS.md` es el ÚNICO doc mutable de "qué estamos haciendo / qué falta". **Ningún otro doc tiene estado.**
- `work/`: al taggear el ship de un grupo, su spec/plan/diseño → `work/_archive/` (el resultado durable ya vive en ADRs + reference + CHANGELOG).
- Docs cambian en el MISMO commit que el código; gate de `grill-with-docs`. UTF-8 sin BOM, español neutro sin voseo (R23/R6).

Detalle del sistema: [framework.md](framework.md) §Sistema de documentación + [../adr/0024-doc-system-topical-living-docs.md](../adr/0024-doc-system-topical-living-docs.md).
