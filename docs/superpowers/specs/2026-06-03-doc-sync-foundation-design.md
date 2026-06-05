# Doc-Sync Foundation (SP-0a) — Design Spec

**Fecha:** 2026-06-03 · **Estado:** Draft (brainstorming -> spec) · **Atendido:** ADR-0026 (Jaime decide en gates).
**Pipeline:** siguiente parada = `grill-with-docs` (capturar ADRs + GATE de backlog). NO `writing-plans` aun.
**Decisions in scope:** extiende [ADR-0024](../../adr/0024-doc-system-topical-living-docs.md) (sistema de docs topical + STATUS unico). Candidate ADR: "integridad de docs machine-enforced" -> capturar en grill-with-docs.

> **Update 2026-06-04 (pre-grill refresh):** la sesion de alcance de planilla/payroll/GDrive (ADR-0028..0031 + enmiendas 0009/0011) cambio 3 hechos-seed de §4.1 y revelo una dimension nueva: **estabilidad de hecho (durable vs provisional)**, incorporada abajo. El grill arranca sobre este baseline ya asentado (CONTEXT.md + ADRs 0028-0031 al dia, regla payroll.* propagada a los enforcers, RLS fail-closed en payroll.* via 078). Hechos cambiados: GG->presidente ahora **provisional** (ADR-0030, ya no "resuelto-durable"); **solo `public.*` prohibido** (payroll.* usable, ADR-0011 update); **planilla en el MVP** (ADR-0028).

---

## 1. Problema

ADR-0024 entrego una arquitectura de docs casi optima (reference/ topical + STATUS unico + ADR append-only + AGENTS->CLAUDE), respaldada por la investigacion correcta (Anthropic best-practices, AGENTS.md, Diataxis, ADR practice, docs-as-code). Pero la dejo **human-enforced**: el propio ADR-0024 (linea 31) admite *"el sistema es human-enforced (no hay hook que lo garantice)"*.

`scripts/check-docs.mjs` solo valida (a) links/@imports rotos y (b) la aparicion de un 2o doc de estado. **No detecta contradicciones semanticas ni hechos duplicados.** Resultado real y recurrente: el mismo hecho (ej. "GG = presidente", "CARTA_TRABAJO la procesa PayDay") se reafirma en 4-6 docs editados por separado, drifta, se contradice — y el dev pierde confianza en la foundation hasta el punto de no querer construir features encima.

**Objetivo del slice:** convertir *human-enforced (drifta)* en *machine-checked (da certeza)*. Los documentos deben dar certeza, no confusion, aun evolucionando.

## 2. Objetivo / No-objetivo

**Objetivo:**
- Mecanizar la deteccion de drift: contradiccion de hechos, hecho duplicado, estado obsoleto en docs durables, cross-ref roto, voseo en docs.
- Enforcement *tiered*: determinista bloquea; LLM/heuristica avisa.
- Dejar el **corpus actual consistente** (no solo entregar tooling).

**No-objetivo (fuera de alcance):**
- Reescribir o reorganizar la arquitectura de docs (ADR-0024 ya es correcta).
- Anadir dependencias externas (markdownlint/lychee/Vale) — ver seccion 6.
- Un LLM que AUTORE contenido canonico (el `ingest` de Karpathy; fuente de alucinacion compuesta). Solo robamos su operacion `lint`.
- Cubrir comentarios de codigo o JSDoc.

## 3. Principio rector

**Un hecho, un dueno. Los demas docs enlazan, no reafirman.** (SSOT + Diataxis "un doc, un tipo".) El dolor no es el numero de docs (~40 esta bien); es la *verdad duplicada* sin enforcement de propiedad.

## 4. Componentes (5 piezas, cada una un solo trabajo)

### 4.1 `docs/reference/canonical-facts.md` — registro de hechos con dueno unico (el corazon)
Cada hecho transversal se define UNA vez. Campos por entrada: `clave | valor canonico | doc-dueno | estabilidad | anti-patron(es)`. **`estabilidad` = `durable` | `provisional`** — provisional = generalizacion del MVP corregible en uso (p.ej. GG->presidente, ADR-0030); el checker no lo enforza como verdad inmutable (ver §5).
- El **anti-patron** es lo que hace el check determinista posible: una o mas regex que, si aparecen en el corpus FUERA del doc-dueno, indican contradiccion.
- Cada contradiccion que se arregla se vuelve una entrada con su anti-patron -> **no puede volver en silencio.** Es, de facto, un *registro de regresion de contradicciones para docs*.
- Seed inicial (con estabilidad): GG->presidente [**provisional**, ADR-0030]; CARTA_TRABAJO->PayDay [durable]; puerto dev=3001 [durable]; **solo `public.*` prohibido** — payroll.* usable [durable, ADR-0011 update]; framing = Groups + fase de fundacion + **planilla en MVP** [durable, ADR-0028]. (Los 3 marcados cambiaron el 2026-06-04 vs el draft original.)

### 4.2 `scripts/check-docs.mjs` expandido — Capa A determinista (BLOQUEA en `verify`)
Anade a lo existente (links + 2o state-doc):
- **Contradiccion de hecho canonico:** parsea canonical-facts.md, busca cada anti-patron en el corpus, falla si aparece fuera del dueno.
- **No live-state en `reference/`:** regex de migration numbers / conteos ("N empleados") en docs durables (la BD es dueña de eso).
- **Voseo en docs:** extiende el guard H9 (hoy en codigo) al corpus de docs.
- **Invariantes estructurales:** todo ADR con linea `Status:`; un ADR superseded enlaza adelante.
Se mantiene **dependency-free** (como hoy) y corre dentro de `npm run verify` (ya invocado por el gate).

### 4.3 Hook de enforcement tiered (extiende los `.ps1` existentes) — AVISA, no bloquea
`stop` / `post-tool-use`: si cambio codigo y NO se toco STATUS/CHANGELOG -> **warning** (no bloquea; evita falsos positivos, porque no todo cambio de codigo necesita doc). El bloqueo duro vive en la Capa A via `verify`. `.ps1` ASCII puro (R23).

### 4.4 `/iconsa-docs-audit` — Capa B, LLM advisory (skill, NO npm script)
Skill de Claude Code que corre en sesion (sin API key ni costo): lee el corpus y devuelve un **reporte** de contradicciones / docs huerfanos / hechos duplicados. **No edita nada.** Humano revisa y decide. Es el `lint` de Karpathy; rechazamos su `ingest`.

### 4.5 Seed + limpieza del corpus actual
Poblar canonical-facts con los hechos que ya causaron drift, correr `/iconsa-docs-audit` sobre el corpus actual, y **arreglar las contradicciones existentes** (las del scope-assessment). Entregable = corpus consistente + guard, no solo guard.

## 5. Tiering de enforcement (decision aprobada: *tiered*)

| Senal | Comportamiento | Por que |
|---|---|---|
| Cross-ref roto, 2o state-doc, contradiccion de hecho canonico, live-count en reference/, voseo en doc, ADR sin Status | **BLOQUEA** (`verify` / pre-commit) | Determinista, alta confianza, cero falsos positivos |
| Reporte LLM de contradicciones/huerfanos/dupes (`/iconsa-docs-audit`) | **AVISA** (no bloquea, no edita) | No-determinista; humano decide |
| Codigo cambio sin tocar docs vivos | **AVISA** (warning) | Falsos positivos si bloquea (no todo cambio necesita doc) |

Hard-gate total -> falsos positivos -> se desactiva. Advisory total -> es lo que ya fallo. Tiered da certeza sin friccion tonta.

## 6. Decision de diseno: cero dependencias externas nuevas (aprobada)

Se rechazan markdownlint / lychee / Vale. Razon: `check-docs.mjs` es dependency-free a proposito ([linea 7](../../../scripts/check-docs.mjs)); el principio de [toolstack-roadmap](../../reference/toolstack-roadmap.md) es native-first + cuesta-de-salida-baja; el dev pidio explicitamente menos piezas que mantener. El link-check ya existe; el voseo ya se lintea en codigo. Anadir 3 deps por capacidad marginal contradice la disciplina que instalamos. *(Override disponible si se quiere el link-checking robusto de lychee.)*

## 7. Arquitectura / aislamiento

| Pieza | Un solo trabajo | Depende de |
|---|---|---|
| `docs/reference/canonical-facts.md` | dato: cada hecho transversal una vez + dueno + anti-patron | — |
| `scripts/check-docs.mjs` (exp.) | guard determinista: falla CI en link / 2o-state / contradiccion / live-count / voseo | canonical-facts.md |
| `.claude/hooks/*.ps1` (ext.) | enforcement advisory: warn cuando codigo cambia sin doc | settings.json existente |
| `.claude/skills/iconsa-docs-audit/` | LLM advisory: reporta contradicciones, no edita | corpus de docs |

## 8. Testing (el guard tambien debe ser confiable)

`check-docs.mjs` recibe fixtures (patron de los hook tests ya anadidos): un doc-fixture con contradiccion conocida + un cross-ref roto + un live-count + voseo; CI asserta exit 1. Sin esto, el guard no es de fiar.

## 9. Criterios de exito

- Re-introducir "GG != presidente" en cualquier doc -> `npm run verify` **falla**.
- Cross-ref roto / live-count en `reference/` / voseo en doc -> **falla**.
- `/iconsa-docs-audit` devuelve reporte limpio sobre el corpus actual (tras arreglar lo que encuentre).
- Fixtures del checker pasan en CI (exit 1 ante drift conocido).

## 10. Diferido / capturado (no parte de este slice)

- markdownlint / lychee / Vale (override posible).
- Bloqueo duro de "codigo sin doc".
- **3 evals build-vs-buy** surgidas en discusion (CMS editorial Payload v2; LMS construir-vs-adoptar v2; ATS v3) -> registrar en backlog de STATUS con disparador explicito. Capturadas aqui para no perderse; NO son scope de SP-0a.

## 11. Preguntas abiertas para grill-with-docs

1. Formato exacto de `canonical-facts.md`: tabla markdown vs YAML frontmatter por entrada (parseabilidad vs legibilidad humana).
2. Inmutabilidad de ADR: enforcement via git-diff en CI, o solo via convencion + check de "Status + superseded-link"?
3. `/iconsa-docs-audit`: skill nuevo, o extender `iconsa-business-rules`/`framework`?
4. Donde vive el registro de las 3 evals build-vs-buy (STATUS backlog vs toolstack-roadmap "EVALUATE-LATER").
5. Alcance del corpus para el checker: incluir `.claude/**` y root, excluir `_archive/` + `superpowers/` (ya excluidos en check-docs.mjs) — confirmar.
