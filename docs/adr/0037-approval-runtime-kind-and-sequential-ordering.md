# El modelo de runtime de aprobación lleva `kind` por step y reinstaura el ordering (`sequential`), desacoplado de la visibilidad de RRHH

**Decidido (propuesto 2026-06-05; CONSTRUIDO + aplicado 2026-06-05 vía mig 094; ratificación de Jaime PENDIENTE).** Surge del worked example VACACIONES en el spec de Group 4 (`docs/superpowers/specs/2026-06-05-group4-engines-vacaciones-design.md`). Es la decisión nueva que NO estaba resuelta por ADR-0015 / ADR-0020 / ADR-0027: cómo el **modelo de runtime** del ApprovalEngine representa gates, processing y **orden**.

> **Status:** Proposed → **construido + aplicado** (mig `094_approvals_kind_vacaciones_engines`, 2026-06-05): `requests.approvals.kind` + RPCs de orquestación + re-seed VACACIONES (`sequential`, 5 steps). **Live-verified** end-to-end (happy path → Aprobada; S1 ordering; R5; reserve/commit/release+N3; rolled-back, cero residuo). **Ratificación de Jaime PENDIENTE** — si rechaza la reinstauración de `sequential` o el hogar de `kind`, esto se revierte. Los engines TS (`src/lib/engines/*`) + VACACIONES backend (server actions) shipped; UI + PdfEngine = slice siguiente.

## Decisión

Dos hechos acoplados, una decisión coherente sobre el modelo de runtime de aprobación:

1. **`requests.approvals` lleva una columna `kind`** (`text`, CHECK `'submit' | 'approval' | 'processing'`). El template (`requests.types.approval_chain_template`) ya debe llevar `kind` por step (ADR-0027), pero las filas de runtime en `requests.approvals` **no tenían dónde registrarlo** (introspección 2026-06-05: la tabla no tiene `kind`). El ApprovalEngine **gatea solo en `kind='approval'`**; `kind='processing'` es recepción/post-aprobación (R8) read-only/admin que **nunca bloquea ni recibe input del empleado**; `kind='submit'` es la fila del solicitante. Esto **generaliza R8** (`received_by/at` + `processed_by/at`) más allá de ACCION_PERSONAL: cualquier cadena puede tener steps de processing (VACACIONES tiene RRHH-recibe + Planilla-verifica).

2. **Se reinstaura el mode `sequential`** en `approval_chain_template.mode` (`'sequential' | 'parallel' | 'direct_hr_admin' | 'any_of_hr' | 'parent_only'`), **desacoplando el ORDEN de los gates de la VISIBILIDAD de RRHH**. En `sequential`, los steps `kind='approval'` gatean en `step_order`; los `kind='processing'` sellan-y-avanzan entre ellos. `visibility:"universal"` mantiene a RRHH en el flujo desde el día 0 **independiente del mode** — la visibilidad ya no depende de la concurrencia de los gates.

### Consecuencias de runtime que esta decisión también fija (surgen del worked example)

3. **Reset de revisión en `sequential`** (análogo del ADR-0004, que solo cubría `parallel`): al aceptarse una revisión, se resetean a `Pendiente` los gates `kind='approval'` en o después del menor `step_order` cuyos campos **atestiguados** cambiaron; los gates previos que firmaron valores no modificados se mantienen. (Un supervisor que aprobó fechas viejas debe re-firmar si las fechas cambian — R7.)

4. **BL-4 (reset anual de numeración):** `requests.next_sequence` ya sustituye `{year}` en TZ Panamá pero no pone `current_value` en 0 al cambiar de año. Decisión: el `{year}` ya desambigua (HUM-2026 vs HUM-2027), así que el reset a `0001` es cosmético — se difiere la elección "contador por-año vs job de reset" a la construcción atendida (DB-SEQRESET, BLOCKED-on-Jaime).

5. **BL-5 (`Devuelta_Info` huérfano):** presente en el CHECK de `approvals.decision` pero ausente del CHECK de `tickets.status` y de todo flujo. El path de modificación de R9 usa el status `Devuelta_Modificacion` + `requests.revisions`. Decisión: **no cablear `Devuelta_Info`**; usarlo solo si Jaime confirma un caso real (decisión a nivel de `decision`, sin transición de status), o eliminarlo del CHECK.

## Contexto / por qué (no estaba en 0015/0020/0027)

- **ADR-0020 ELIMINÓ explícitamente `sequential`** ("no aplica al pattern HumanOS donde RRHH siempre debe ver desde día 0"). Ese razonamiento **confundió el orden de los gates con la visibilidad de RRHH**. VACACIONES (PO-05 §5.9) prueba que el orden SÍ es necesario: GG firma **último**, después de que Planilla verifica acumulados. Como `visibility:"universal"` ya garantiza la visibilidad día-0 de RRHH sin importar el mode, reinstaurar el orden no reintroduce el problema que 0020 quería evitar. Reinstaurar `sequential` **enmienda ADR-0020**.
- **ADR-0027 mandó `kind` por step** y su §Consecuencias dice "steps llevan `kind`", pero decidió la SEMÁNTICA (firma=aprobación, RRHH=visibilidad), no el **hogar de runtime** (columna en `approvals` vs reusar `received_by/processed_by` a nivel de ticket). Esa es la pieza nueva.
- Sin (1) el ApprovalEngine no puede distinguir en runtime un gate de un step de processing → no puede implementar las reglas 2/3 de ADR-0027. Sin (2) VACACIONES tendría que modelarse como `parallel`, permitiendo que GG apruebe antes de la verificación de saldo → infidelidad de SOP (R26) + violación de ADR-0027 r4 ("PO maestro gana").

## Alternativas descartadas

- **Modelar processing con solo las columnas a nivel de ticket (`received_by/at` + `processed_by/at`) y generalizar R8 sin columna `kind`** — rechazado: solo soporta UN paso de recepción y UNO de procesamiento por ticket; VACACIONES ya tiene dos steps de processing distintos (RRHH-recibe + Planilla-verifica) que necesitan filas propias con sello (R7) y SLA propios. La §Consecuencias de ADR-0027 apunta a la columna.
- **Mantener `sequential` eliminado y expresar el orden con `step_id` + un arco `depends_on`** — rechazado para el MVP: más flexible pero más complejo; `mode:'sequential'` + `step_order` modela el SOP directamente y es lo que el ChainBuilder (v1.1) editará.
- **Shipear VACACIONES como `parallel` "por velocidad"** — rechazado: rompe PO-05 §5.9 (orden load-bearing) y ADR-0027 r4. Es el trap central que este ADR cierra.

## Consecuencias / cross-refs

- Migración (atendida): `requests.approvals` + `kind` (CHECK; default para back-compat) + `step_order`/`kind` formalizados en `approval_chain_template`. Re-seed de VACACIONES (y pasada `kind` sobre las otras 15 cadenas-sin-schema). **DB-1** (audit-trigger SECURITY DEFINER) se decide DENTRO de esa misma migración/plan (STATUS §7, acoplado al ApprovalEngine).
- El **write helper `hr.post_leave_ledger_entry` ya existe** — reusar (R5/CLAUDE.md regla 5).
- Relacionado: ADR-0015 (engines genéricos), ADR-0020 (enmendado: `sequential` reinstaurado), ADR-0027 (semántica de `kind`; este ADR fija el runtime), ADR-0004 (reset paralelo; este ADR añade el análogo secuencial), ADR-0030 (GG=president provisional), ADR-0033 (design-only).
- Backlog: cierra/encamina DB-1, DB-SEQRESET (BL-4), BL-5; re-difiere BL-6/BL-7 (SLA/escalación + delegación) a Group 6.
