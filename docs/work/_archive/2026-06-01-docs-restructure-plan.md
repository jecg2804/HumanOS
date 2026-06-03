> **ARCHIVADO / SUPERSEDED (2026-06-03).** ejecutado (W0; ADR-0024). Estado vivo: `docs/STATUS.md`. No empezar aqui.

# Docs Restructure Plan — set canónico + ownership

**Status:** PLAN (para una pasada dedicada; no ejecutado todavía). Ratifica la dirección de
`AUDITS-PENDING-CONSOLIDATED §0.1` + `skill-integration-design §5/§6`.
**Por qué dedicado:** es coordinado (mueve/mergea 14 docs + renumera ADRs con cross-refs) y subjetivo;
no afecta runtime. Rushearlo al final de una sesión larga arriesga cross-refs rotos en todo el árbol.

## 1. Provenance — quién creó qué y quién lo mantiene (esto importa para el merge)

| Doc(s) | Creado por | Naturaleza | Mantenedor going-forward |
|--------|-----------|-----------|--------------------------|
| `08-ADRs.md` (ADR-0001..0014) | **Chat** (decisiones estratégicas de planeación) | Prosa, un archivo, numeración propia | **Congelado** — no más entradas |
| `docs/adr/*.md` (0001..0009) | **skill `grill-with-docs`** (Pocock) durante implementación | Un archivo por ADR, auto-numera "max+1" | **grill-with-docs** lo sigue alimentando (0010+) |
| `00-INDEX`, `01-VISION`, `02-MVP-SCOPE`, `04-DOMAIN`, `05-BUSINESS-RULES`, `07-SCHEMAS`, `11-MDM`, `12-SOR`, `13-INTEGRATIONS`, `14-COMPLIANCE` | Chat (numerados) | Referencia de dominio/estrategia | Code mantiene los técnicos (07); Chat los estratégicos (01/02) |
| `06-FRAMEWORK` | Chat + Code | Proceso/harness | Code (es quien opera el harness) |
| `09-ESTADO-ACTUAL` | Code | Estado operacional vivo | Code (o derivar de BD/CHANGELOG) |
| `CONTEXT.md`, `docs/adr/` | **grill-with-docs** | Glosario vivo + decisiones | grill-with-docs (inline durante dev) |
| `CHANGELOG.md`, `AUDITS-PENDING`, `DEFERRED-ITEMS` | Code | Tracking | Code |

**Implicación clave del merge de ADRs:** los dos ledgers no son redundantes — `08-ADRs` es *decisión
de producto/estrategia* (la tomó James/Chat), `docs/adr/` es *decisión técnica de implementación* (la
tomó grill con Code). Al mergear NO se borra información: se renumeran en una sola secuencia
preservando fecha + autor-origen en el cuerpo ("originalmente Chat ADR-00NN"). El ledger canónico
pasa a ser `docs/adr/` porque es el que el skill alimenta automáticamente y es git-friendly.

## 2. Estado actual (post sesión 2026-06-01)

- ✅ Ya hecho: índice canónico `docs/adr/README.md`; `08-ADRs.md` marcado FROZEN con banner; ADR-0009
  (scope) creado en `docs/adr/`; naming `person_sources` corregido en 11/12; repomix incluye `supabase/**`;
  conteo de tests de CLAUDE.md corregido; CLAUDE.md ya está en 147 líneas (<200).
- ⚠️ Colisión conocida: existe `ADR-0009` en AMBOS ledgers (08-ADRs "Framework cherry-pick" vs
  docs/adr/0009 "scope"). Desambiguado por ubicación vía el README, pero la secuencia única todavía no
  existe. grill creará 0010 (no colisiona).

## 3. Trabajo restante (lo que esta pasada debe ejecutar)

### A. Merge físico de ADRs (D2-merge) — one-way door, hacer primero y con cuidado
1. Inventariar las 14 entradas de `08-ADRs` + las 9 de `docs/adr/` + la cross-ref table.
2. Definir el mapa de renumeración a una sola secuencia `0001..00NN` (preservar contenido/fecha; anotar
   origen Chat en el cuerpo). Resolver la colisión 0009.
3. Migrar cada entrada de `08-ADRs` que no tenga archivo a `docs/adr/NNNN-*.md`.
4. Actualizar TODAS las cross-refs en el repo (`grep -rn "ADR-00"` en docs/ + CLAUDE.md + código).
5. Borrar `08-ADRs.md` + la cross-ref table; actualizar import de CLAUDE.md a `@docs/adr/*.md` + README.
6. Validar con `grep` que no quede ningún "ADR-00NN" apuntando al esquema viejo.

### B. Consolidación de docs (D1/D3)
- **D3 merges:** `03-*` (deferred) → dentro de `02-MVP-SCOPE`; `10-*` (process) → dentro de `06-FRAMEWORK`;
  vocabulario de `04-DOMAIN` → `CONTEXT.md` (el glosario vivo que mantiene grill).
- **D1 kill audience-split:** quitar el triple-stack de `00-INDEX`, los headers Owner/Audiencia, y la
  §7 de `PROJECT_CONSTITUTION` que separa por audiencia. Un solo set, no "docs para Chat vs Code".

### C. Demociones a `docs/future/` (D7-demote) — crear el directorio
- Mover `11-MDM-PRINCIPLES` + `12-SOR-MATRIX` a `docs/future/` (son foundational/aspiracional, no
  operacionales hoy). Dejar un stub/pointer en su lugar.

### D. Slims y splits (D5/D6-slim/D8)
- **D5:** `09-ESTADO-ACTUAL` → ~1 pantalla (fase + in-flight + blockers + decisiones humanas); el resto
  deriva de BD/CHANGELOG.
- **D6-slim:** quitar de `CLAUDE.md` el bloque completo de design tokens (vive en `globals.css`) + la
  prosa larga de mental-model (queda el principio + pointer al skill). Ya <200 líneas; esto es polish.
- **D8:** `13-INTEGRATIONS` → split por status: LIVE (Resend, Vercel, Supabase) en el doc principal;
  planned/ETL (PayDay, Spectrum, B2W, Skydata) → `docs/future/`.

### E. Staleness (D10-DOC4 + 06-stale)
- **D10-DOC4:** revisar `07-SCHEMAS-PERMISOS` (fechado 2026-05-27, counts viejos) — actualizar o apuntar
  a BD como fuente de counts (no duplicar).
- **06-stale:** reemplazar en `06-FRAMEWORK` la tabla "Workflow correcto" + sección "Overnight phases"
  por el pipeline v2 (`brainstorm → spec → grill → plan → dev → verify → review → close`).

### F. Headers (D4) — al final, sobre el set ya consolidado
- Header de 3 líneas por doc: **Role** (qué es) / **Read-when** (cuándo leerlo) / **Maintain-when**
  (cuándo actualizarlo). Hacerlo después de A-E para no re-trabajar docs que se mueven/mergean.

## 4. Orden de ejecución (dependencias)
A (ADRs) → C (crear docs/future/) → B+D+E (consolidar/mover/slim) → F (headers sobre el resultado).
Commit incremental por sub-paso. Validar con `grep -rn "ADR-00\|03-\|04-\|10-\|people_external_ids"`
que no queden referencias colgadas tras cada move.

## 5. Riesgos
- **Cross-refs rotos** (el riesgo #1): cada move/rename/renumber rompe links. Mitigación: grep-validate
  después de cada paso; el merge de ADRs es el más peligroso (hacerlo primero, aislado, verificable).
- **Pérdida de provenance**: al mergear ADRs, preservar autor-origen en el cuerpo.
- **CLAUDE.md import drift**: si se mueve un `@docs/NN-*` referenciado en CLAUDE.md, actualizar el import.
