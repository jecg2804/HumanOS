# 14-COMPLIANCE-LEY81.md — Cumplimiento Ley 81/2019 (Protección de Datos Personales, Panamá)

**Role:** marco técnico/de proceso de compliance con la Ley 81/2019 panameña (datos personales/sensibles) — base de R27. · **Read-when:** al manejar datos personales/médicos, consentimiento, retención, o derechos ARCO. · **Maintain-when:** cambia la ley, el marco de compliance, o un control técnico asociado.

**Status:** DRAFT para revisión legal — NO es asesoría legal. Code redactó el marco técnico/de proceso; un abogado panameño debe validarlo antes de go-live.
**Fecha:** 2026-05-29
**Origen:** Audit 2026-05-29 (gap P1 — la app guarda datos sensibles sin marco de compliance documentado).
**Regla asociada:** R27 (ver `05-BUSINESS-RULES.md`).

---

## 0. Por qué esto aplica (aunque la app sea interna)

HumanOS es de uso interno de ICONSA, pero **los empleados son titulares de datos** bajo la Ley 81/2019, vigente desde 2021 y reglamentada por el Decreto Ejecutivo 285 de 2021. La autoridad (ANTAI, Dirección de Datos Personales) investiga y **sanciona de $1,000 a $10,000** por infracción según gravedad. Un sistema con RLS perfecta que recolecta datos médicos sin consentimiento sigue siendo ilícito. Que el tratamiento sea interno no exime de las obligaciones.

## 1. Inventario de datos personales en HumanOS

| Dato | Dónde vive | Categoría Ley 81 |
|---|---|---|
| Nombre, cédula (`national_id`), `employee_code` | `hr.people` | Personal |
| Foto | `hr.people` / `files.uploads` | Personal (biométrico-adjacente) |
| Contacto (email, teléfono), direcciones | `hr.contacts`, `hr.addresses` | Personal |
| Contactos de emergencia | `hr.contacts` (type=emergency) | Personal (de terceros) |
| **Datos médicos** (tipo sangre, alergias, medicamentos, # CSS, aseguradora) | `hr.medical_info` | **SENSIBLE (salud)** — consentimiento previo, expreso e irrefutable |
| **Salario / compensación** | `hr.employments` | Personal sensible-adjacente (confidencial) |
| Documentos personales (contrato, etc.) | `hr.personal_documents` | Personal |
| Solicitudes (vacaciones, préstamo, etc.) + adjuntos | `requests.*`, `files.uploads` | Personal |

R13 ya restringe `hr.medical_info` + `hr.personal_documents` a owner + hr_admin vía RLS — base técnica correcta, pero **falta la capa de consentimiento + ciclo de vida + derechos del titular**.

## 2. Obligaciones de la Ley 81 → estado en HumanOS

| Obligación | Estado actual | Acción requerida |
|---|---|---|
| **Consentimiento** previo/informado/inequívoco (y **expreso+irrefutable** para salud) | ❌ no se captura | Agregar paso de consentimiento en el onboarding wizard (F1) ANTES de capturar médicos/emergencia (Step 6/7). Registrar `consent_at`, `consent_version`, `consent_scope` en BD. |
| **Limitación de finalidad** (usar solo para el fin declarado) | parcial (RLS limita acceso) | Declarar finalidad en el aviso de privacidad mostrado en onboarding. |
| **Confidencialidad** de quien trata los datos | parcial (R13 RLS) | Acuse de confidencialidad firmado por hr_admin (Samantha, Rocío, Milagros, Jerelyn). |
| **Seguridad** del tratamiento | ✅ fuerte (RLS, SECURITY DEFINER, Sentry R13-safe, ClamAV pendiente para uploads) | Mantener; agregar scan de malware (P2 ClamAV) + cifrado en reposo (Supabase lo da). |
| **Notificación de brechas** a afectados | ❌ sin runbook | Crear breach-notification runbook (detección → evaluación → notificar afectados + ANTAI → registro). |
| **Retención** (límite 7 años tras extinguirse la obligación legal) | ❌ sin política | Definir política de retención + purga (ex-empleados: cuánto se conserva, qué se anonimiza). |
| **Derechos del titular** (acceso, rectificación, cancelación, oposición — ARCO) | parcial (`/perfil` permite ver/editar algo) | Definir el flujo: cómo un empleado solicita acceso/rectificación/eliminación de SUS datos; quién aprueba. |
| **Registro de tratamientos** | parcial (`audit.log`) | Documentar el inventario (este doc) como registro de actividades de tratamiento. |
| **Transferencias** (a terceros / cross-border) | N/A interno hoy | Cuando se integre PayDay/B2W/etc. (visión MDM), evaluar acuerdos de transferencia. |

## 3. R27 (resumen — texto completo en 05-BUSINESS-RULES.md)

**R27 — Compliance Ley 81:** todo flujo que capture datos personales debe (a) obtener consentimiento registrado antes de capturar datos sensibles (médicos/emergencia), con consentimiento expreso e irrefutable para salud; (b) respetar el límite de retención (purga/anonimización post-relación laboral); (c) exponer un flujo de derechos del titular (acceso/rectificación/eliminación); (d) mantener confidencialidad (acuse hr_admin); (e) seguir el breach-notification runbook ante incidentes. No recolectar datos sensibles sin consentimiento, aunque RLS lo proteja.

## 4. Checklist para el abogado (preguntas abiertas)

1. ¿El aviso de privacidad + consentimiento en onboarding cubre lo exigido por la Ley 81 + Decreto 285/2021 para datos de salud?
2. ¿Cuál es el período de retención correcto para expedientes de ex-empleados en Panamá (laboral vs Ley 81 7-años)? ¿Qué se conserva por obligación laboral/fiscal y qué se purga/anonimiza?
3. ¿Se requiere registrar a ICONSA o el tratamiento ante ANTAI?
4. ¿Los contactos de emergencia (datos de terceros) requieren tratamiento especial?
5. ¿El plazo y forma de notificación de brechas (a afectados y/o ANTAI)?
6. ¿El acuse de confidencialidad de hr_admin debe tener forma específica?

## 5. Próximos pasos técnicos (Code, cuando se aprueben)

- Onboarding: paso de consentimiento + aviso de privacidad antes de Step 6/7 (médicos/emergencia); columnas `consent_*` en BD (migración futura, schema permitido).
- `/perfil`: sección de derechos del titular (solicitar acceso/rectificación/eliminación).
- Runbook de brechas en `docs/` + integración con Sentry (detección).
- Política de retención + job de purga/anonimización (post-MVP).

## Fuentes

- [Arias Law — análisis Ley 81](https://ariaslaw.com/es/detalle-noticia/1281/2/analisis-de-la-ley-numero-81-sobre-proteccion-de-datos-personales)
- [ANTAI — reglamentan Ley 81](https://antai.gob.pa/reglamentan-ley-81-de-proteccion-de-datos-personales/)
- [Decreto que reglamenta la Ley 81 (gaceta)](http://gacetas.procuraduria-admon.gob.pa/29296-A_56425.pdf)
- [Texto Ley 81/2019 (Asamblea)](https://s3-legispan.asamblea.gob.pa/legispan/NORMAS/2010/2019/LEY/Administrador%20Legispan_28743-A_2019_3_29_ASAMBLEA%20NACIONAL_81.pdf)
- [RSM Panamá — Ley 81 risk advisory](https://www.rsm.global/panama/es/news/ley-81-proteccion-de-datos-personales)
