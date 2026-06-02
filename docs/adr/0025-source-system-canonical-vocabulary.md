# 0025 — Vocabulario canónico de `source_system`: token de SoR `humanos_app`, distinto del origen (`person_sources`)

**Fecha:** 2026-06-02 · **Status:** Accepted · **Decidido por:** James (W1 batch 1). **Relacionado:** ADR-0014 (MDM gradual), ADR-0011 (schemas modulares).

## Decisión

El `source_system` de las tablas de dominio (system-of-record por fila) usa un **vocabulario único y canónico**, reusado en cada columna SoR:

```
source_system IN ('humanos_app', 'payday', 'b2w', 'spectrum', 'manual_entry')
```

- **Token app-native = `'humanos_app'`** (NO `'humanos'`). Razón: `'humanos'` choca con el schema **prohibido** `humanos.*` (R1, demo v1 deprecado) y con el token `'humanos_v1'` que vive en `hr.person_sources`. `humanos_app` desambigua: "masterizado por la app HumanOS actual".
- **Semántica = system-of-record** (qué sistema es dueño/autoritativo de esta fila HOY), NO el origen histórico.

## Tres conceptos relacionados, NO intercambiables

1. **`source_system`** (esta decisión) — system-of-record actual. Vocabulario SoR cerrado de arriba. En las tablas master-data de `hr.*` + `hr.leave_*`.
2. **`hr.person_sources.source_system`** — el **ORIGEN / lineage** de dónde vino el dato de una persona. Vocabulario PROPIO y distinto: `movimientos | excel_samantha | payday | spectrum | manual | humanos_v1 | onboarding`. Incluye `humanos_v1` (el demo deprecado) precisamente porque registra procedencia histórica. **No se le aplica el CHECK SoR.**
3. **`created_from`** (en `hr.people`/`hr.employments`) — provenance app-level de cómo se creó la fila en la app (onboarding/admin/migración). Se **conserva**; semántica distinta de `source_system`. Podría deprecarse más adelante, no ahora (rompería código).

## Contexto

W1 batch 1 (`054_foundation_lifecycle_columns`) introdujo `source_system` como fundación transversal (MDM Pilar 8, data lineage) en las 9 entidades master-data de `hr`. El diseño original (`db-final-vision-design.md` §1.3) proponía DEFAULT `'humanos'`; James lo corrigió a `humanos_app` por la colisión con `humanos.*`/`humanos_v1`, y exigió alinear `hr.leave_*` (creadas en 047 con `'humanos'`) al mismo token + CHECK para no dejar dos tokens para lo mismo.

## Alternativas rechazadas

- **`'humanos'` como token** — colisiona con el schema prohibido y con `humanos_v1`; ambiguo. Rechazado.
- **Reusar la vocabulary de `person_sources`** — mezcla SoR (dueño actual) con origen (lineage histórico); `person_sources` debe quedar como la fuente de origen, separada. Rechazado.
- **Vocabularios por-tabla** — fragmenta el lineage; el CHECK canónico único previene drift. Rechazado.

## Consecuencias

- Toda columna `source_system` nueva (Groups 5-7, tablas MDM/ETL futuras) usa el CHECK canónico (PROVISION-NOW del diseño).
- `hr.leave_*` re-alineadas (`humanos`→`humanos_app`, backfill no-op por estar vacías).
- Glosario en `docs/CONTEXT.md` (source_system vs origen vs created_from).
