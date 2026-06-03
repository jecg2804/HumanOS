> **ARCHIVADO / SUPERSEDED (2026-06-03).** propuesta ejecutada; end-state en docs/ + ADR-0024. Estado vivo: `docs/STATUS.md`. No empezar aqui.

# HumanOS — Sistema de Documentación (propuesta, research-backed)

**Estado:** PROPUESTA pendiente de GO de James. Al ejecutarse, este doc + `HANDOFF-NEXT-SESSION-2026-06-01.md` + `superpowers/specs/2026-06-01-docs-restructure-plan.md` se archivan (reemplazados por este sistema).
**Base:** investigación 2026-06-01 (Anthropic Claude Code best-practices, OpenAI Codex AGENTS.md, Diátaxis, ADR practice, spec-driven dev, docs-as-code) + inventario completo de los ~50 docs actuales.

## Diagnóstico (por qué se siente sprawl)

Se mezclaron 4 ciclos de vida en un solo montón, y hay **6 docs de "estado" solapados** (09-ESTADO, DEFERRED-ITEMS, AUDITS-PENDING, 2 handoffs, + §0.5/§9 que duplican CHANGELOG). Una sesión nueva debe leer ~8-10 docs (miles de líneas) y las "órdenes actuales" están partidas entre 3 sitios. Eso es el desync y el costo de arranque que sientes.

## Principios (de la investigación)

1. **CLAUDE.md = contrato de comportamiento**, ~150 líneas, progressive disclosure (apunta, no explica inline). [Anthropic]
2. **Nombres topicales estables > prefijos numerados (00-14).** Los números codifican un orden que el agente no consume linealmente, y renumerar al insertar/borrar rompe cross-refs e historia (fuente real de desync). Numeración SOLO para ADRs (IDs inmutables). [Codex AGENTS.md, naming guides]
3. **4 ciclos de vida, 4 hogares:** verdad durable (editar in-place) · decisiones (ADR append-only) · trabajo por-feature (spec+plan, se archiva al shippear) · estado efímero (UN solo doc). [Diátaxis, ADR, docs-as-code]
4. **Overnight build = el spec/plan es el contrato vinculante:** acceptance criteria como checkboxes mapeados a tests, edge cases, refs a R1-27; guardrail hooks; verify gate. El grill atrapa desviaciones ANTES del código. [spec-driven dev, Adaline/Anthropic autonomy]

## Sistema objetivo

```
CLAUDE.md                 # contrato (~150 ln) — entry point, apunta a todo
AGENTS.md                 # entry delgado para Codex (puntero a lo esencial de CLAUDE)
PROJECT_CONSTITUTION.md   # principios + R-rules (pointer a business-rules; kill §7)
docs/
  reference/              # VERDAD DURABLE — editar in-place, nunca archivar (nombres topicales, sin números)
    vision.md  mvp-scope.md  domain.md  business-rules.md
    schemas-permisos.md  framework.md  compliance-ley81.md  integrations.md
  CONTEXT.md              # glosario vivo (única fuente de vocabulario)
  adr/                    # DECISIONES — append-only, inmutables, IDs 0001-00NN + README
  STATUS.md               # EL ÚNICO doc de estado: fase + in-flight + blockers + backlog(con triggers/gate)
  CHANGELOG.md            # historia — append-only
  work/                   # spec + plan del group en construcción
    _archive/             # spec/plan se mueve aquí al taggear el ship
  future/                 # conocimiento PLANEADO, no operacional (mdm, sor, integrations-planned)
  sops/                   # PDFs fuente
```

## Reglas de mantenimiento (van en CLAUDE.md + framework.md — las sigue cada sesión)

- **reference/** siempre vigente, se edita in-place, sin fechas, nunca se archiva.
- **adr/** append-only; una decisión superada se marca `Superseded` + nuevo ADR, no se edita.
- **STATUS.md** es el ÚNICO doc mutable de "qué estamos haciendo / qué falta". Ningún otro doc tiene estado → mata el desync.
- **CHANGELOG.md** append-only (lo "hecho").
- **work/**: al iniciar un group se crea su spec+plan; **trigger de archivo: al taggear el ship del group**, su spec+plan → `work/_archive/` (el resultado durable ya está en ADRs+reference+CHANGELOG).
- **Drift control:** docs cambian en el MISMO commit que el código; gate de `grill-with-docs`; check CI de links rotos + "no debe existir 2do doc de estado".

## Camino de arranque de sesión nueva (el habilitador de overnight builds)

Lee SOLO: **`CLAUDE.md` → `STATUS.md`** → arranca el pipeline (brainstorm→spec→grill→...). El pipeline jala los docs de `reference/` **just-in-time** (solo el relevante al feature). De ~10 docs de arranque → **2**.

## Migración (one-time, grep-validada, en sesión fresca)

1. Capturar el sistema: 1 ADR + sección en `framework.md` + reescribir `00-INDEX`→`reference/README` con las reglas.
2. Renombrar 00-14 → `reference/<topical>.md`; actualizar TODOS los @imports/cross-refs (grep-validate).
3. Colapsar estado: `09-ESTADO`+`DEFERRED-ITEMS`+`AUDITS-PENDING`+2 handoffs → **`STATUS.md`** (folddear hallazgos míos + Codex como backlog con triggers).
4. `work/` + `_archive/`; mover specs/plans consumidos; borrar stubs 03/10 + `HANDOFF.json` (gitignore).
5. Fold de duplicados: type→mode table (una sola en business-rules, las otras pointer); vocab 04→CONTEXT; R-rules Constitution §4→pointer.
6. Arreglar stale encontrados: GitHub URL (`jecg2804/HumanOS`), James/Jaime, test count 9/67, schema-list Constitution §1, migration drift, types/baseline.

**Net:** verdad durable preservada en ~8 reference + CONTEXT + ADRs + future/; cluster de estado 6→**2 (STATUS + CHANGELOG)**; ~9 docs efímeros/historia archivados. Arranque de sesión 10→2 docs.
