# HumanOS — Catálogo HR autoritativo + plan de launch por arcos

**Estado:** working doc (insumo del spec formal). · **Creado:** 2026-06-03. · **Fuente:** lectura completa del GDrive `RECURSOS HUMANOS` (la SOR de SOPs, vía conector claude.ai `read_file_content`) + reconciliación contra los 24 `requests.types` en BD (`bzeoszympkkicwlfdtcn`) + análisis de gaps ley Panamá. Reemplaza el análisis basado solo en `docs/sops/` (espejo incompleto).

> **Por qué existe:** el bar de launch es **TODOS los formularios/solicitudes funcionando con workflow de aprobación completo** (no-negociable, Jaime). Esto enumera el catálogo real desde la fuente, las cadenas validadas (R26), los gaps legales, y el orden de build. NO se difieren features del MVP — se secuencian.

---

## 1. Reglas de diseño firmes (Jaime, 2026-06-03) — R26 + arquitectura

Estas rigen TODO `approval_chain_template` y el ApprovalEngine:

1. **Gerente General = `president`.** Las cadenas que terminan en "Gerencia/Gerente General" mapean al rol `president` en BD.
2. **RRHH (`hr_admin`) SIEMPRE está en el flujo.** Aunque NO sea gate de aprobación, todo ticket **pasa por RRHH** como paso de recepción/processing. Universal.
3. **Regla R8 (post-aprobación):** los bloques "Recibido / Procesado / Para uso de oficina / Conocimiento y verificación" (Asist. Planillas, RRHH-archivo, Finanzas) son **processing post-aprobación** → render read-only/admin, **nunca** input del empleado ni gate. Se modelan como steps `kind=processing`, distintos de `kind=approval`.
4. **Cadenas admin-editables (principio de arquitectura).** Los flujos NO se hardcodean: viven en `requests.types.approval_chain_template` (config) y un **ChainBuilder** (admin UI, evolución del F39 "viewer" → editor) permite a Samantha editarlos. Condicionales (p.ej. umbral $250 del préstamo) = reglas configurables, no código. Esto es la visión CMS/Arcoro aplicada al workflow.
5. **Supervisor = dropdown** (`requests.tickets.selected_supervisor_id`, ya modelado, R6/R10). El solicitante elige su supervisor. Refinamiento: **pre-seleccionar** `employment.supervisor_id` si se conoce, con override en el dropdown (sin depender de organigrama perfecto).
6. **R5 no-self-approval, R7 sello, R9 back-and-forth (aprobar/rechazar/modificar), R16 estados, R24 modos** — del ApprovalEngine, aplican a TODOS los tipos. Construir una vez en el engine.

---

## 2. Realidad de build (reconciliación BD ↔ fuente)

- **24 `requests.types` en BD; solo 8 tienen `form_schema` poblado** (Cat-B: CAMBIO_CUENTA_BANCO, CAMBIO_DEPENDIENTES, CERTIFICACION_LABORAL, CONSTANCIA_NO_ADEUDO, COPIA_COLILLA, COPIA_CONTRATO, REPORTE_INCIDENTE, SOLICITUD_EPP). **16 tienen cadena pero NO `form_schema`** → ése es el gap primario que este catálogo llena (ahora con las listas de campos de la fuente).
- **`src/` no tiene engine** (solo auth + onboarding + admin empleados + perfil + notif). El cuello de botella = FormEngine + ApprovalEngine + dashboard de tickets, NO el schema (la BD ya está ~2 grupos adelante).
- **Onboarding ya shipped** (F1 wizard, F4 admin, F5 SCD-2, F-01-09/F-04-01 acks) = el origen-papel de F-01-08/F-01-09/F-04-01 → NO reconstruir.

---

## 3. Catálogo buildable de request-forms

### A. Tipo en BD ya existe — autorar `form_schema` desde la fuente (cadena existe, schema FALTA)

Campos: `[source]` = profile (prerrellenado read-only) / user_input / computed ("Calculado", nunca se pide).

1. **VACACIONES** (F-05-03). Campos: Tipo de Pago [Completas/Adelanto/Descuento] `user_input`; Tiempo [Completas/Parciales] `user_input`; hasta 3 rangos Del/Al `user_input` (grupo repetible); **Saldo acumulado `computed`**; Observaciones. profile: Nombre, Cédula. Cadena §4.
2. **PRESTAMO** (F-05-02). Monto solicitado, Descuento propuesto, **Motivo (obligatorio, D-02)**, Firma (consentimiento a descuento). Bloque "uso de oficina" = R8 admin-only. Reglas D-02: cap $250 default, tiers bisemanales por cargo, gate de endeudamiento previo, residual neteado en liquidación → como **validación + reglas configurables**, no hardcode.
3. **PERMISO (horas)** (F-00-08). Fecha, Hora salida/entrada, **Duración `computed`**, Propósito, Tipo [Descuento/Pago/Remunerado]; bloque RRHH (acumulado `computed`). profile: Nombre, Cédula, Depto.
4. **RECLAMO_PAGO** (F-05-05). Horas Reg/ST, Cert. médicos, Ausencias, Feriados, Horas reportadas(supervisor) `user_input`; **Diferencia `computed`**; comprobante de pago `file` (req). Cifras pagadas se LEEN de `payroll.*` (R1, nunca escribir). SLA RRHH 48h.
5. **REFERENCIA_LABORAL** (F-00-06). Intake de RRHH sobre candidato EXTERNO → todo `user_input`, nada profile. ~14 selects de competencia + motivo retiro + volvería-a-contratar.
6. **ENTREVISTA_SALIDA** (F-00-05). ~12 selects de satisfacción + regresaría Sí/No + textareas. profile: Nombre, Cédula, Posición, Supervisor; **Tiempo en empresa `computed`**. Empleado completa, RRHH recibe.
7. **CAPACITACION** (F-02-09). Dos fases en una hoja: Fase 1 solicitud (supervisor = solicitante, empleado = sujeto); Fase 2 = eval de efectividad **+30 días** → modelar como **tarea programada** (reusar Vercel Cron), NO step bloqueante.

### B. Tipo en BD CON `form_schema` (NO reconstruir; reconciliar campos solo si hay drift)
SOLICITUD_EPP (las tallas T-shirt/bota nacen en F-01-08), REPORTE_INCIDENTE, CAMBIO_CUENTA_BANCO (= "Pago por ACH" en F-01-09), CAMBIO_DEPENDIENTES, COPIA_CONTRATO, COPIA_COLILLA, CARTA_TRABAJO/CERTIFICACION_LABORAL, CONSTANCIA_NO_ADEUDO.

### C. Documentado-pero-NO-construido (sin tipo en BD — net-new)
8. **EVALUACION_DESEMPENO** (F-03-03, performance). 9 selects competencia + 3 textareas (logros/mejorar/plan) + fecha entrevista. Evaluador=Supervisor; firma empleado = acuse, NO aprobación.
9. **EVALUACION_CAMPO** (F-03-04, performance). 5 criterios 1-5 (Seguridad/Calidad/Productividad/Actitud/Puntualidad) → **Total/% `computed`**; "¿Lo contrataría?" Sí/No (feed a rehire-eligibility). Rúbrica = IT-04. Cadena: Capataz → Superintendente/Ing → RRHH(procesado). ⚠️ anomalía OCR (header "Solicitud de Préstamos" pegado — ignorar, verificar PDF).
10. **ENTREGA_COMBUSTIBLE** (F-00-04, benefit-in-kind). Datos vehículo (placa, marca, gls/mes, tipo) `user_input`. Cadena: Supervisor→GG (aprobación) → RRHH(recibe)+Finanzas(procesa) R8.
11. **REGISTRO_ALCOHOLIMETRO** (F-00-01) — **LOG de seguridad** (no request por-empleado). Bitácora multi-fila llenada por RRHH/seguridad. **EXTREMO Ley81/R27** (dato de salud) → RLS restringido, base legal, retención. Positivo → enlaza disciplinario.
12. **DESCUENTO_DIRECTO** (IT-02, futuro) — autorización distinta de PRESTAMO; cadena Empleado→Contabilidad(recibe)→**RRHH(aprueba)**→**GG/Rep.Legal(aprueba)**→Planilla(notifica). Doble consentimiento (empleado + rep-legal) obligatorio; límites 20%-bruto/$100-neto = payroll-owned (read-only).

### D. Acciones de Personal (tipos existen, cadenas existen, FALTA `form_schema`; maestro F-05-01 gobernado por PO-05)
ACCION_PERSONAL (maestro) + ACCION_AUMENTO_SALARIO, ACCION_DESCUENTO, ACCION_DESPIDO, ACCION_HORAS_EXTRAS, ACCION_LIQUIDACION, ACCION_PERMISOS, ACTUALIZACION_DATOS. F-05-01 maestro: Nombre/Cédula/Depto profile + checkboxes [Aumento/HorasExtras/Permisos/Descuento/Despido/Liquidación] + Observaciones. **F-05-04 Amonestación → tipo nuevo AMONESTACION** (disciplinario; supervisor-iniciado; firma empleado = acuse; GG+RRHH = Recibido).

---

## 4. Cadenas corregidas (R26, ruling Jaime) — PO maestros ganan sobre scans 2012

Universal: GG=`president`; **RRHH siempre en el flujo** (gate o processing); R8 = read-only.

- **VACACIONES:** Empleado(submit) → RRHH(recibe/enruta, processing) → **Supervisor/Gerente de Proyecto(aprobación)** → Planilla(verifica acumulados, processing) → **GG=president(aprobación final)**.
- **PRESTAMO:** Empleado → **Supervisor(aprob)** → **RRHH(aprob real — beneficio social + verifica endeudamiento)** → **GG=president(aprob, siempre, también <$250)** → Asist.Planillas(paga + acuse, processing). [Umbral $250 = regla configurable, no hardcode.]
- **PERMISO (horas):** Empleado → **Supervisor(aprob)** → **RRHH(en flujo, recibe)** → Asist.Planillas(procesa). [Corrección: RRHH SÍ en el flujo.]
- **AMONESTACION:** Supervisor(inicia sobre empleado) → Empleado(firma=acuse, NO aprob) → GG(Recibido) + RRHH(Recibido). Sin gate de aprobación del empleado.
- **ENTREGA_COMBUSTIBLE:** Supervisor(aprob) → GG=president(aprob) → RRHH(recibe) + Finanzas(procesa).
- **REFERENCIA_LABORAL / ENTREVISTA_SALIDA:** sin cadena multi-step. Intake/HR-recibe. (RRHH en flujo.)
- **EVALUACION_CAMPO:** Capataz → Superintendente/Ing(aprob) → RRHH(procesa). EVALUACION_DESEMPENO: firma empleado = acuse del interview.
- **CAPACITACION:** el papel solo imprime 2 firmas de supervisor; **el step Gerente/RRHH reconstruido se VALIDA con Jaime antes de congelar** (no hardcodear).
- **DESCUENTO_DIRECTO:** Empleado → Contabilidad(recibe) → RRHH(aprob) → GG/Rep.Legal(aprob) → Planilla(notifica).
- **ACCIONES (PO-05):** la cadena per-acción se LEE del cuerpo de PO-05 por tipo, NO se asume. Patrón base: Empleado/Supervisor(submit) → Supervisor(aprob) → GG=president(aprob) → RRHH(Recibido) → Asist.Planillas(Procesado).

---

## 5. Tipos FALTANTES (gaps ley Panamá / market — net-new, sin SOP → los creamos)

Inferidos de Código de Trabajo + CSS + MITRADEL + DIGECA (validar duraciones vs Código antes de codificar lógica legal). Prioridad ICONSA-construcción:

**Musts legales:** LICENCIA_MATERNIDAD (14 sem + **fuero que BLOQUEA despido** = R-nueva; subsidio CSS) · INCAPACIDAD_CSS/CERTIFICADO_MEDICO · LICENCIA_PATERNIDAD (Ley 238/2021) · AVISO_ENTRADA_CSS + AVISO_SALIDA_CSS + REGISTRO_CONTRATO_MITRADEL (bookends legales) · REPORTE_INCIDENTE→R.A.T.E.P. CSS.
**Alto valor construcción:** ACCION_TRASLADO (la acción más frecuente — `location_id` ya modelado) · ACCION_PROMOCION/CAMBIO_CARGO (escalera Suntracs) · ACCION_SUSPENSION · RENUNCIA (cierra offboarding) · RECONTRATACION · ADELANTO_SALARIO · REEMBOLSO/VIATICOS · AFILIACION_SINDICATO (SUNTRACS) · QUEJA_DENUNCIA (canal confidencial, RLS restringido).
**Cleanup:** unificar los 3 conceptos de "permiso" (PERMISO horas / ACCION_PERMISOS / día-libre) en una taxonomía de licencias.

---

## 6. Instruction-specs que MANEJAN features (no son forms — especifican estructura)

- **IT-01 "Organización del expediente del personal"** = la **taxonomía de documentos del expediente digital** (flagship de Samantha): contrato, cédula, licencia, carné CSS, solicitud_empleo, hoja_entrada, hoja_vida, descripción_puesto, acción_personal, certificación, préstamo, solicitud_vacaciones, carta_trabajo, **certificado_médico (restringido Ley81)**, certificado_capacitación. → diseña `docs.*` doc-type taxonomy + categorías de upload + el expediente UI.
- **D-05 "Glosario de Prestaciones según Contrato"** = SOR de los campos `computed` de compensación + el **enum de tipo de contrato** en `hr.*`: Tiempo Definido / Servicios Profesionales (sin prestaciones/descuentos) / **Obra-Fases** (vacaciones+XIII+6% indemnización al cierre de fase, SS+SE+ISR+1% cuota sindical) / Tiempo Indefinido. Período prueba=3 meses. HumanOS LEE, planilla calcula.
- **IT-04** = rúbrica 1-5 (anclas por aspecto) → el `form_schema` de EVALUACION_CAMPO.
- **Suntracs-Santraico 2010** = el **catálogo de cargos** (Ayudante, Albañil, Carpintero, Mecánico 1a/2a, Operadores, Choferes, Rigger…) + reqs por rol → seed del enum de cargo. (Rigger reqs médicos = Ley81.)
- **PO-01 (recruiting)** = cadena + catálogo de 13 registros F-01-* (solo F-01-08/09 leídos; 11 instrumentos de reclutamiento pendientes). Dos vías: STAFF (Perfil de Vacante) vs CAMPO (Listado Final / Gerente de Proyecto). Certs obligatorias: Operador Grúa/Equipo Pesado, Conductor, Soldador, Rigger, Mecánico.

---

## 7. KB / out-of-scope / junk

- **KB-policy (publicar + ack):** D-01 Inducción Campo (+ F-02-07 read-receipt), M-01 Ética (19pp, cita Ley 81/2019 — informa `compliance-ley81`), D-06 Comedor, D-07 Trabajo Infantil. Patrón = ack-on-ingreso (como F-01-09/F-04-01 ya shipped).
- **Expediente-data (record, no workflow):** F-04-01 Emergencia (Ley81 médico — RLS restringido, supervisores NO ven), F-02-05 Eval Post-Entrenamiento (learning.*), F-02-04 Lista Asistencia (learning.* roster).
- **Out-of-scope (payroll/PayDay, HumanOS LEE nunca escribe `payroll.*`):** IT-03 ISR, PO-06 Planilla, "Control de Pago de Horas".xls. Reglas útiles de PO-06: vacaciones 11mo/año, ISR umbral >$916.75/mo, cesantía 6%, employee_code = 3 letras apellido paterno + 3 últimos dígitos cédula.
- **Junk:** "Solicitud de día libre".doc (instancia ad-hoc; su intención ya la cubre PERMISO).

---

## 8. Plan de build por arcos (NADA diferido — secuenciado)

- **ARC 0 — tooling/infra de test:** Supabase branching + pgTAP + supabase-test-helpers + Squawk + `db diff` (arregla los gaps del audit: 0 cobertura de RPCs, RLS sin tests, baseline-drift). OCR de SOPs one-off (Docling+Mistral) para el runtime KB. **Aprobado por Jaime.**
- **ARC 1 — signup + consent + expediente + dashboard:** rework signup/identidad + **wire Ley 81 consent** (gap #1: `medical_info=43` vs `consent=0`) + bucket propio HumanOS + perfil/directorio + **expediente digital (IT-01)** + dashboard de tickets (Samantha lo pidió temprano).
- **ARC 2 — engines (ruta crítica):** FormEngine + ApprovalEngine (R5/R9/R24) + ChainResolver + StampEngine + **ChainBuilder/FormBuilder (CMS admin-editable)** + seed leave-policies (D-05) + ADR audit-trigger. Probar contra **acciones de personal** (el caso duro = la prioridad).
- **ARC 3 — catálogo completo de forms (config):** autorar los 16 `form_schema` + los tipos nuevos (§3.C, §5) como instancias del engine. Cada uno: cadena validada (R26) + field-source matrix + E2E.
- **ARC 4 — KB-CMS + performance + learning/certs + announcements + analytics.**
- **Módulos/plataforma (expediente UI, CMS-builder, perf, learning, anuncios, mapa vs Viewpoint/Spectrum/ProjectSight/B2W/PayDay):** pendiente del benchmark `w3qrmwut0` (re-corriendo) → se anexa aquí.

---

## 9. Pendientes de decisión (Jaime)

- Validar la cadena reconstruida de **CAPACITACION** (el papel no imprime gate GG/RRHH).
- Confirmar header de **F-03-04** (anomalía OCR "Solicitud de Préstamos").
- Alcance de los **11 registros de reclutamiento F-01-* no leídos** (¿ATS al launch o fast-follow?).
- Las duraciones/reglas de las **licencias estatutarias** (§5) — validar vs Código de Trabajo antes de codificar.
