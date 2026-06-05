# 0034 — People sync v2 (Spectrum GetEmployee): sidecar SCD-2 de clasificacion + survivorship FLAG-ONLY

**Fecha:** 2026-06-05 · **Status:** Accepted · **Decidido por:** Jaime (diseno atendido en sesion) + consejo adversarial (ADR-0033, overnight). **Relacionado:** ADR-0032 (Core MDM / `core.field_authority`), ADR-0014 (MDM gradual, no big-bang), ADR-0006 (service-role sin sesion), R12 (SCD-2), R22 (auth.users), R27 (Ley 81). **Spec/plan:** `docs/superpowers/specs/2026-06-05-sdx-people-sync-v2-design.md` + `docs/superpowers/plans/2026-06-05-sdx-people-sync-v2-plan.md`.

## Contexto (verificado live 2026-06-05)

`sdx-sync` v1 ingiere los masters Spectrum (`core.*`). v2 = sync de **personas** (`GetEmployee`, 184 live). Hechos que reformaron el diseno (vs el handoff):

- Spectrum `Supervisor_Code` y `GetEmployeeUDF` vienen **vacios 184/184** ⇒ Spectrum NO es fuente de jerarquia ni de identidad; no se usa UDF.
- Los campos "org" de Spectrum (`Department_Code` DIRECT/INDIRE/OPERAC, `Cost_Center`, `Wage_Class`, `Union_Code`, `Occupation`, `Worker_Comp_Code`, `Trade`) son un **eje payroll/labor**, distinto del eje HR-org de `hr.employments` (`position_id`/`department_id`→`hr.org_units`). Mapearlos a los FK existentes corromperia la semantica.
- `core.field_authority` declara esos 6 campos como `spectrum`/`sor_wins`, pero **no existian columnas** donde aterrizarlos. `employment_status` = `humanos_app`/`manual_override`.
- Match limpio: `hr.people.employee_code` **es** el codigo Spectrum (184 Activo ~1:1 con los 184 live). Z-sentinels (`ZRIO9999`, `ZEIS99999`) ausentes de `hr.people`.

## Decision

1. **Sidecar SCD-2 dedicado `hr.employment_classifications`** (NO columnas en `hr.employments`, NO blob jsonb, NO tabla en `core`). Razon: dos fuentes con **cadencias distintas** (admin edita HR-org; el sync nocturno cambia la clasificacion payroll) no deben compartir una sola linea temporal SCD-2; el sidecar da survivorship por-fuente limpia (Spectrum es dueno absoluto de su tabla ⇒ `sor_wins` trivial, cero contencion) y **no desestabiliza** la funcion golden `hr.apply_employment_scd2_change`. Vive en `hr.*` (persona-scoped) ⇒ es enriquecer `hr.*`, sin conflación de timelines.
2. **Funcion SCD-2 propia `hr.apply_spectrum_classification`** (SECURITY DEFINER, `search_path=''`, service_role-only). `is_current` manejado **explicitamente** (true al insertar, false al cerrar) — corrige la ambiguedad de la funcion v1. Audita en `audit.log` (`action='custom'`, actor del sistema NULL, before/after en `metadata`).
3. **Survivorship FLAG-ONLY `hr.sync_spectrum_people`** (SECURITY DEFINER): por record salta Z-sentinels; resuelve persona (crosswalk `hr.person_sources` → `employee_code` case-insensitive); upsert del crosswalk (record verbatim en `external_data`); enriquece la clasificacion; **FLAGea** `status_drift` y `new_active_unmatched`. **NUNCA escribe identidad ni `status` de `hr.people`, NUNCA crea personas, NUNCA toca `auth.users`.** Crea personas/cedula = flujo consentido de onboarding (Group 3), no una maquina nocturna (Ley 81 + R22 + `field_authority national_id←onboarding`).
4. **Crosswalk = `hr.person_sources`** (source=`spectrum`, external_id=`employee_code` UPPER-normalizado, `external_data`=snapshot). No se crea `*_external_ids` para el sidecar (el crosswalk de personas ES `person_sources`).
5. **`employment_status` (A/C/S):** asuncion `A=Activo`, `C/S=Inactivo`; comparar contra `hr.people.status`, FLAG en divergencia, **nunca** overwrite (manual_override). Semantica exacta de C/S a confirmar con Samantha/vendor (no bloquea).
6. **Edge `sdx-people-sync`** (Deno) reusa `supabase/functions/_shared/sdx.ts` (helpers extraidos; v1 intacto). **Cron nocturno DESHABILITADO** en `vercel.ts` hasta confirmar el auth/GUID con el vendor (Dexter+Chaney/iconsanet).

## Alternativas rechazadas

- **Columnas Spectrum en `hr.employments`** — conflaciona dos cadencias en una linea SCD-2; obliga a extender la funcion golden; survivorship por-fila enredada.
- **Blob jsonb** — opaco para Planilla, survivorship por-campo pobre.
- **Tabla en `core` (master paralelo de personas)** — recrea el dual-master que ADR-0032/0014 evitan; el contrato cross-app de personas ya es `core.persons` VIEW.
- **Auto-crear personas desde el sync** — choca con Ley 81 (consentimiento), R1c (writes a `hr.people`) y `national_id←onboarding`; el match es ~1:1, el caso es raro ⇒ FLAG.

## Consecuencias

- **Cold-start verificado 2026-06-05** (batch `4965244f`, live en BD): 184 leidos, 176 matched/enriched, 2 Z-skipped (`ZRIO9999`, `ZEIS99999`), 12 flagged = 6 `new_active_unmatched` (BA323, AVE701, CAS497, GAR860, QUI321, TIN470) + 6 `status_drift` (DOM689, ESP956, GUT617, ROD522, SOL256, VEL322). `core.sync_runs` people = `success` (rows_upserted 352 = 176 crosswalk + 176 enrich, rows_flagged 12). FLAG-ONLY probado: `hr.people` SIN cambios (370; Activo 184 / Inactivo 186; 0 spectrum-sourced), `hr.employments` 184 current SIN cambios, 0 R12 multi-current; `hr.employment_classifications` 176 (all current). Los 12 flags = follow-ups de reconciliacion de HR-admin (data follow-ups, NO bugs).
- Primer consumidor REAL de `core.field_authority` (de declarativo a vivo) para el eje empleo/org.
- Reconcilia backlog: SIGNUP-datamodel (link `employee_code`↔`person_sources` parcialmente satisfecho), DB-VISION-B (sidecar nace con soft-delete + source_system).
- Planilla (Group 4-5) consumira `hr.employment_classifications` (cost_center/department/wage_class) como insumo.
- Pendiente (flagged, no bloquea): semantica C/S, confirmacion auth vendor para el cron, refactor de v1 a `_shared` (diferido a sesion atendida), pgTAP de las 2 funciones (TF-FOUNDATION).
