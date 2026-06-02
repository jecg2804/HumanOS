# 0026 — Modelo de trabajo: diseño atendido + ejecución de plan aprobado sin interrupción (retira "overnight autónomo")

**Fecha:** 2026-06-02 · **Status:** Accepted · **Decidido por:** Jaime. **Relacionado:** ADR-0018 (framework cherry-pick), ADR-0024 (doc-system topical), ADR-0009 (scope / secuencia de grupos). **Reframea (no supersede schema):** el framing "overnight autónomo" en `docs/reference/framework.md`, `docs/reference/vision.md`, `docs/reference/mvp-scope.md`.

## Decisión

El modelo operativo de HumanOS es **diseño atendido + ejecución de plan aprobado sin interrupción**. NO existe un "build overnight autónomo".

1. **Fases de diseño = ATENDIDAS.** El pipeline canónico de diseño (brainstorm → spec → grill → plan) corre con Jaime en cada gate: él decide scope, diseño, reglas de negocio y resuelve las preguntas abiertas. Code propone y argumenta; Jaime decide. Nunca se difiere ni se decide arquitectura en silencio.
2. **Ejecución = sin interrupción innecesaria.** Una vez Jaime aprueba un plan (tasks atómicas, sin decisiones abiertas), Code lo lleva a término de corrido: implementa, verifica (`npm run verify` + CI), y actualiza los docs vivos en el MISMO commit. Esto es lo único "autónomo" — ejecución de un contrato ya cerrado, no diseño.
3. **El promise mecanismo refleja esto:** `<promise>PLAN_COMPLETE</promise>` (o `<promise>PARTIAL</promise>` con la lista explícita de lo que quedó) marca el fin de la ejecución de un plan aprobado — NO un "MVP overnight completo". Ver `CLAUDE.md §Promise mechanism`.
4. **Trabajo directo a `main`, atendido** (Constitution §5.6): greenfield, sin usuarios productivos, dev solo. CI es la señal visible; `npm run verify` verde antes de push; si algo entra rojo, Jaime revierte. `enforce_admins` queda OFF (el owner bypassa los required checks en push directo; los checks aplican vía PR).

## Contexto

El framing heredado describía "Overnight #1/#2" como builds autónomos nocturnos que entregarían el MVP completo de un tirón. **Eso fue aspiracional y nunca real:** Groups 1-2 (`v0.0.1`, `v0.0.2`) se construyeron human-in-the-loop, y la fundación W0-W1 también. La ejecución desatendida de un grupo completo nunca cumplió los criterios de readiness (revisor independiente idealmente cross-model, E2E completo, gate de merge bloqueante) — ver `docs/work/framework-hardening-design.md §4` y `docs/reference/framework.md §Plan-execution readiness`. Mantener el framing "overnight" en los docs inducía a justificar decisiones por un modo de operación que no existe.

## Consecuencias

- `CLAUDE.md §Promise` + `PROJECT_CONSTITUTION.md §5.6` ya codifican el modelo (commit `4267b0c`); este ADR es el registro canónico al que ambos apuntan.
- "Overnight #1/#2" en `vision.md` / `mvp-scope.md` se renombran a "MVP (primer release usable, ADR-0009)" / "Fase 2" — **sin cambiar el scope** (las 39 features F1-F39 siguen siendo el MVP).
- `framework.md` reframea "pre-overnight" / "Overnight execution readiness" → "pre-ejecución de plan" / "plan-execution readiness", conservando la sustancia (smoke tests + criterios de readiness siguen aplicando a la ejecución de un plan aprobado).
- La ejecución desatendida sigue siendo *posible* como caso particular (un spec descompuesto sin decisiones abiertas + un plan aprobado), pero NO es el default y NUNCA aplica a fases de diseño.

## Alternativas rechazadas

- **Mantener "overnight autónomo" como modelo aspiracional** — induce a justificar decisiones por un modo que nunca operó; genera docs que contradicen la práctica real (atendida). Rechazado.
- **Borrar toda mención de ejecución desatendida** — la ejecución sin interrupción de un plan aprobado SÍ es real y valiosa; solo se retira el framing "overnight / nocturno / MVP de un tirón". Rechazado.
