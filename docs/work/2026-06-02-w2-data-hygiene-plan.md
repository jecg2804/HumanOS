# W2 DATA-HYGIENE — Plan de normalización

**Fecha:** 2026-06-02 · **Status:** PROPUESTA — pendiente de revisión de SQL por Jaime. Las migraciones de *forma* no se aplican sin su OK; el *backfill de valores* queda gated en data fresca (Samantha) + signup. · **Decisiones base:** Jaime 2026-06-02 (#1-#5, abajo). · **Backlog:** `DATA-HYGIENE`, `SIGNUP-formula`, `SIGNUP-datamodel` (STATUS §6).

> **Principio rector (de Jaime):** lo ejecutable AHORA es la **estructura** (migraciones de forma, revisables W1-style). El **backfill de valores** NO se ejecuta ahora — depende de data fresca de Samantha + captura en signup. "Forma ahora, valores después." Y `Paso 0 SIEMPRE`: snapshot a `backup.*` antes de cualquier `UPDATE`.

---

## 1. Audit read-only (qué encontramos — cero mutaciones)

Población: **370** personas (184 Activo, 186 Inactivo); 0 soft-deleted; **0 con `auth_id`** (nadie linkeado a login). Procedencia única `humanos_app`/`consolidation`; lineage en `hr.person_sources` (excel_samantha 239, movimientos 178, humanos_v1 36), pero **`external_data` vacío + `external_id` no-cédula** → **no hay fuente interna para backfill de cédula**.

| Dimensión | Estado | Acción |
|---|---|---|
| `full_name` (campo único) | Formato limpio (0 ws/caps/comas); 370 distintos; 77% solo 2 tokens; 11 con partículas; sin `first_name`/`last_name` | Forma: añadir `given_names`/`surnames`. Valor: revisión HR (no auto-split) |
| Cédula `national_id` | 53/370 (14%); activos 50/184; **134 activos sin cédula**; pobladas mayormente DGI canónico + variantes válidas (E-, pasaporte, asiento corto) | Forma: UNIQUE + (CHECK draft). Valor: adquisición fresca (Samantha) + signup |
| `employee_code` | 180/184 activos; `AAA###` en 179; 5 válidos off-pattern (KOSM01, PI1939, RIO83, RU1681, SA7620) | Sin cambio. Nota a SIGNUP-formula |
| Duplicados | 0 por cédula / 0 por nombre normalizado, **PERO** 6 inactivos con sufijo ` 2` = dup-person enmascarado (ej. "Hector Pino 2" Inactivo vs "Hector Pino" Activo PI1939) | **Nuevo:** revisión de merge HR (V-4) |
| `hr.addresses` | 128/370 con dirección; `country`=Panamá ok; `city` inconsistente (case + sin tildes + es provincia/distrito); `province` **0/128**; `street` 25% | Valor diferido (vocab Samantha). Baja urgencia |
| `hr.contacts` | 289; phone 35% (formato limpio); email 79%; `is_emergency`=0 | Emergencia la captura onboarding (Group 3) |

### Variantes REALES de cédula encontradas (NO son errores — confirmar set con Samantha)
- `#-###-###` (26), `#-###-####` (22) — DGI estándar.
- `#-###-##` (3) — asiento corto (cédulas antiguas, p.ej. `4-780-21`, `8-507-83`, `8-921-25`). **Válidas.**
- `E-#-######` (1) — naturalizado (`E-8-150161`). **Válida.**
- `AY######` (1) — pasaporte de extranjero (`AY844924`, común en construcción). **Válida.**

---

## 2. Decisiones de Jaime (2026-06-02)

1. **Split nombre:** ✅ añadir `given_names`/`surnames` (nullable) vía migración de forma, con COMMENT. NO auto-split-y-confiar; poblar por revisión asistida de HR (flag `needs_review`). Valores = paso gated aparte.
2. **Cédula:** NO re-leer `public.*` (MovimientOS ya consolidado en `hr.*`; el gap es dato real-faltante, no un join). Adquisición FRESCA: export actual de Samantha + captura en signup. **Impacto signup (R14):** sin cédula en archivo no hay triple-validación → decisión de Group 3.
3. **Formato cédula:** definir CHECK DGI + `national_id` UNIQUE, PERO acomodar variantes reales (E-/PE-/N- + pasaporte). Los "edge" son identidades válidas. **Validar el set de variantes con Samantha antes de congelar el regex.**
4. **Ubicación:** Provincia>Distrito>Corregimiento (jerarquía real PA), migrar `city`→`province`, normalizar case/tildes. Vocab de Samantha. **Baja urgencia (no bloquea Group 3).**
5. **Inspección de errores:** hecha (read-only). Resultado: los "errores" son mayormente válidos (codes off-pattern, cédulas edge) + 6 dup-person con sufijo ` 2` → V-4.

---

## 3. Migraciones de FORMA — para aplicar AHORA (pendiente revisión de SQL)

Aditivas, no-destructivas (no tocan data existente → no requieren snapshot; reversibles vía `DROP COLUMN`/`DROP INDEX`). RLS de `hr.people`/`hr.addresses` ya activa; columnas nuevas heredan las policies de tabla (R13: ninguna de estas es médica/sensible-restringida, son PII de directorio).

### Migración 063 — `063_add_given_surnames_to_people`

```sql
-- 063: split estructural de full_name (forma). Valores poblados por revision HR (no auto-split). full_name sigue siendo display SoR.
ALTER TABLE hr.people
  ADD COLUMN given_names text,
  ADD COLUMN surnames   text;

COMMENT ON COLUMN hr.people.given_names IS
  'Nombre(s) de pila separados de full_name. Convencion Panama: 1-2 nombres (ej. "Juan Carlos"). Poblado por revision asistida de HR (NO auto-split); full_name sigue siendo el display SoR. NULL hasta revisar (marcar needs_review=true).';
COMMENT ON COLUMN hr.people.surnames IS
  'Apellido(s) separados de full_name. Convencion Panama: tipicamente 2 (paterno + materno, ej. "Perez Gonzalez"); puede incluir particulas (de, del, de la). Poblado por revision asistida de HR; NULL hasta revisar.';
```

*Nota: `text` sin CHECK de longitud, por consistencia con `hr.people.full_name` (también `text` libre). Si prefieres un cap defensivo (`char_length <= 120`), lo agrego.*

### Migración 064a — `064_national_id_unique_index`

```sql
-- 064: UNIQUE defensivo sobre national_id (cedula/pasaporte = identidad legal unica por persona).
-- Normaliza case+espacios para blindar contra variantes futuras. Parcial: permite multiples NULL (317 sin cedula hoy).
-- 0 duplicados hoy -> creacion segura. Soporta SIGNUP-datamodel (Group 3).
CREATE UNIQUE INDEX people_national_id_unique
  ON hr.people (upper(btrim(national_id)))
  WHERE national_id IS NOT NULL AND btrim(national_id) <> '';
```

---

## 4. BLOQUEADO / DIFERIDO — forma que necesita decisión humana

### 064b — CHECK de formato de cédula  · **BLOCKED-on-Samantha (variantes)**
Candidato permisivo (acepta cédula `n-tomo-asiento`, prefijos `E/PE/N/AV`, y pasaporte alfanumérico; rechaza vacío/garbage):

```sql
-- DRAFT — NO aplicar hasta validar el set de variantes con Samantha (decision #3).
ALTER TABLE hr.people ADD CONSTRAINT people_national_id_format CHECK (
  national_id IS NULL
  OR upper(btrim(national_id)) ~ '^[A-Z0-9]+(-[A-Z0-9]+){0,2}$'
);
```
**Alternativa más blanda (recomendada si el set de variantes es amplio):** sin CHECK duro; en su lugar un flag soft `needs_review` para las no-canónicas, que HR confirma. Decide tú/Samantha cuál.

### (NNN al aplicar) — Jerarquía de ubicación (Provincia/Distrito/Corregimiento) · **DIFERIDO (baja urgencia + vocab Samantha)**

> *Nota de numeración: las migraciones APLICADAS toman los números secuenciales (065 = SEC-ENQUEUE, 066 = SEC-LEGACY drop). Esta de ubicación, por estar DIFERIDA, NO pinea número — se numerará al aplicar (hoy iría ~067+).*
`hr.addresses` ya tiene `province` (vacío), `city`, `neighborhood`, `country`. Propuesta (cuando se haga): añadir `district`/`corregimiento` (nullable, COMMENT) y migrar `city`→`province` con vocabulario acentuado de Samantha. **No bloquea Group 3 → se difiere.**

---

## 5. Scripts de VALOR — DIFERIDOS (gated; NO se ejecutan ahora)

> `Paso 0 SIEMPRE` antes del primer `UPDATE` de cada uno:
> ```sql
> CREATE TABLE backup.hr_people_20260602    AS SELECT * FROM hr.people;
> CREATE TABLE backup.hr_addresses_20260602 AS SELECT * FROM hr.addresses;
> CREATE TABLE backup.hr_contacts_20260602  AS SELECT * FROM hr.contacts;
> ```
> (Patrón R22. `backup.*` es schema permitido. Fecha real al ejecutar.)

- **V-1 — Split de nombre (HR-assisted).** Opción A: HR captura `given_names`/`surnames` 1×1 vía UI (Group 3 perfil/admin). Opción B (acelerador): script llena un *sugerido* + `needs_review=true` + `review_notes='split sugerido, confirmar'`; HR confirma/corrige. **No es "auto-split-y-confiar"** — es draft-para-confirmar. Gated en tu elección A vs B.
- **V-2 — Backfill de cédula.** Fuente: export fresco de Samantha (donde la tenga) + captura en signup para el resto. Import vía migración con normalización + el CHECK/UNIQUE de §4. **Gated en data de Samantha.** Bloquea R14 triple-validación para 134 activos (decisión de Group 3).
- **V-3 — Normalización de ubicación.** `city`→`province` + case/tildes, vocab Samantha. **Diferido, baja urgencia.**
- **V-4 — Merge de dup-person ` 2`.** 6 inactivos con sufijo ` 2` (ej. "Hector Pino 2"); confirmar con HR si son la misma persona que un activo → merge o conservar. **Read-only review primero; mutación gated.**

---

## 6. Definition of Done (al aplicar cada batch aprobado)

- Snapshot `backup.*` previo (solo fase de valor).
- `apply_migration` (NO `supabase db push`) → `list_migrations` → archivo local `<ts>_NNN_*.sql`.
- `get_advisors` (security+performance) limpios para nuestros schemas; `multiple_permissive_policies` = 0.
- `migration-reviewer` + `rls-reviewer` sobre el `.sql` (plugin Supabase ya conectado esta sesión).
- `CHANGELOG.md` `[bd] NNN_... - qué - por qué` + estado en `STATUS.md` (W2), mismo commit.
- `supabase gen types ... --schema public,hr,...` regen si la forma cambió tipos consumidos por código.

---

## 7. Lo que pido aprobar ahora

1. **SQL de 063 + 064a** (arriba) → aplico al darme el OK.
2. **064b CHECK:** ¿candidato permisivo o flag soft? (o esperar a Samantha).
3. **V-1:** ¿Opción A (manual UI) u B (sugerido + needs_review)?
4. Confirmar que **la ubicación (sin número pineado) + V-2/V-3/V-4 quedan diferidos/gated** (no se tocan ahora).
