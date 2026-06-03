# MVP Scope - features, engines, modes, roadmap post-MVP

**Role:** scope MVP (39 features F1-F39 + engines + modes) + roadmap post-MVP. · **Read-when:** al planificar un grupo/feature o decidir si algo entra en MVP vs diferido. · **Maintain-when:** cambia el scope de una feature, su status, o el roadmap post-MVP.

**Última actualización**: sesión 2026-05-27 (modes finales + F39 admin viewer chains Nivel A + decisiones SOP-driven + BD ready post-migrations); roadmap post-MVP absorbido de 03 (2026-06-01)

**Mantenimiento:** auditar cada feature contra la BD real (Supabase MCP) antes de cerrar su scope; el status por-feature vive aquí, el estado global en `../STATUS.md`.

> **⚠️ Doc detrás de la BD (foundation final-check 2026-06-03):** la BD está ~2 grupos adelante de lo que este doc implica. Verificado contra la BD viva: NotificationEngine NO es "parcial" (Resend+Cron+outbox live); `requests.next_sequence()` YA existe (migración 050 — NO es pre-req pendiente); son **16** tipos sin `form_schema` (no 15) y 7 de Cat-B ya lo tienen; los 24 tipos ya tienen `approval_chain_template` seeded + verificado vs R11. Implicación: Groups 5+6 NO son ~18 builds — son ~16 `form_schema` JSONB (config/data) una vez que la FormEngine renderiza. Re-encuadre engine-first + secuencia de **grupos** (Group 3-7, ADR-0009) + una fase de fundación tooling/test pre-Group-3: ver `../STATUS.md` §2 + el catálogo autoritativo `../work/2026-06-03-hr-catalog-and-launch-plan.md`.

---

## Filosofía del MVP

**El MVP — primer release usable (ADR-0009) — entrega un SHELL FUNCIONAL completo end-to-end**, no perfección de cada feature. Es la base sobre la cual iteración humana posterior refina UI, edge cases, copy específico.

Construye **engines genéricos** + **first pass de cada feature** + **happy paths verificados con E2E**. Refinamiento granular es iteración humano-en-loop post-MVP.

**MVP completo confirmado por Jaime**: 39 features F1-F39. NO subset.

> **39 vs ~33 (canonical):** 39 = tamano del catalogo (variantes de form); ~33 = build-units honestos (ACCION_PERSONAL = una familia engine-driven, no N builds separados); First Usable Release = milestone a cobertura completa de TODOS los forms (ADR-0009). NO diferir features del MVP. Catalogo HR autoritativo: [`../work/2026-06-03-hr-catalog-and-launch-plan.md`](../work/2026-06-03-hr-catalog-and-launch-plan.md). Los ~14 tipos net-new del legal-gap estan IN-SCOPE (no diferidos).

---

## Engines genéricos (lo que ningún form tiene custom, todos comparten)

Estos son construidos UNA vez y reutilizados por las 24 form variants:

| # | Engine | Responsabilidad |
|---|---|---|
| E1 | **FormEngine** | Renderer dinámico desde `requests.types.form_schema` JSONB. Tipos: text, number, currency, date, datetime, select, multiselect, textarea, file_upload, signature_canvas, computed |
| E2 | **ApprovalEngine** | State machine con estados: Borrador → Enviada → En_Revision → (Aprobada / Rechazada / Devuelta_Modificacion) → Completada / Cancelada. **Soporta 3 modes + parent_only**: `parallel`, `direct_hr_admin`, `any_of_hr`, `parent_only` |
| E3 | **ChainResolver** | Resuelve aprobadores per step según: `requests.types.approval_chain_template.steps[]` + resolver kind (`selected_supervisor_id` / `any_hr_admin` / `president_user`). RRHH siempre notificado desde día 0. Fallback NULL supervisor → hr_admin actúa solo |
| E4 | **StampEngine** | Genera sello formato "Aprobado por [nombre], [fecha YYYY-MM-DD], [hora HH:MM:SS]" + `stamp_data` jsonb con `{signer_id, signed_at, ip, user_agent}` para audit |
| E5 | **PdfEngine** | Puppeteer/react-pdf con registry de templates por tipo. Genera PDF del ticket con formato original SOP cuando aplica |
| E6 | **NotificationEngine** | Resend integration + in-app notifications (`notifications.outbox`). Respeta preferencias usuario configuradas en F33 `/settings` |

### Approval modes — definición exacta

`requests.types.approval_chain_template` JSONB con estructura:

```json
{
  "mode": "parallel" | "direct_hr_admin" | "any_of_hr" | "parent_only",
  "visibility": "universal",
  "steps": [
    {
      "step_id": 1,
      "role": "supervisor" | "hr_admin" | "president",
      "resolver": "selected_supervisor_id" | "any_hr_admin" | "president_user",
      "sla_hours": 72,
      "required": true
    }
  ]
}
```

**Comportamiento por mode + mapping completo tipo → mode → SLA → steps (24 tipos):** fuente canónica **[`business-rules.md` R11](business-rules.md#r11--mapping-tipos--mode-per-sop)** (modes, resolvers, SLA por tipo, `allow_supervisor_override`). No se reproduce aquí para evitar drift. RRHH siempre incluido día 0 excepto `parent_only`. Verdad runtime: BD `requests.types.approval_chain_template`. El desglose por feature F# (con SOP + notas) está en las tablas de abajo.

---

## Features del MVP (F1-F39)

### Auth y onboarding (5 features)

| # | Feature | Notas |
|---|---|---|
| F1 | Sign-up flow `/onboarding/[invite_code]` wizard 10 steps | Triple validación: invite_code + national_id + employee_code opcional. Detecta auth.user existente (multi-app) y append `humanOS`. Identificador: email O phone |
| F2 | Login `/login` con email + password (magic link opcional) | Supabase Auth |
| F3 | AppShell responsive mobile-first (sidebar + topbar) | Tailwind 4 @theme tokens |
| F4 | `/admin/empleados/nuevo` (hr_admin crea skeleton + invite code auto) | 10 campos críticos |
| F5 | `/admin/empleados/[id]/editar` (hr_admin edita data persona) | Fallback si empleado no puede self-service |

### Perfil y directorio (3 features)

| # | Feature | Notas |
|---|---|---|
| F6 | `/perfil` base con secciones: Datos personales, Empleo, Contacto, Emergencia, Datos médicos, Foto | Versión básica. Versión robusta es F34 |
| F7 | `/perfil/editar` formulario edición campos auto-editables | Algunos campos solo hr_admin (empleo, salario via SCD-2) |
| F8 | `/directorio` con foto, búsqueda, filtros (departamento, supervisor, ubicación) | Solo empleados activos |

### Knowledge base completa (1 feature)

| # | Feature | Notas |
|---|---|---|
| F9 | `/ayuda` KB **completa de la carpeta RRHH GDrive**. Incluye: manuales (M), documentos políticas (D-tipo educativos), instrucciones técnicas (IT), procedimientos operativos (PO), formularios (F). Categorizado en `docs.article_categories`. Rich text en `docs.articles` + PDF originales en `docs.sops`. Full-text search | Carpeta `1qS-MkGRH2Vmt9rwI5ihNLWdkduh5v1A4` GDrive completa |

### Tickets — 18 tipos top-level (24 form variants con sub-tipos)

Cada uno usa los engines E1-E6. Construido como instancia de FormEngine + ApprovalEngine + ChainResolver con su `requests.types.approval_chain_template`.

**Categoría A — Solicitudes empleado con SOP en GDrive (9 tipos top + 6 sub-types):**

| # | Tipo | Código SOP | Mode + Chain | Notas |
|---|---|---|---|---|
| F10 | VACACIONES | F-05-03 | parallel: supervisor + hr_admin + president | Validar no-traslape. Lógica staff vs permanente. SLA 72h |
| F11 | PRESTAMO | F-05-02 | parallel: supervisor + hr_admin + president (TODOS día 0, $250 no bloqueante) | ICONSA NO cobra intereses. Content educativo D-02 inline. SLA 72h |
| F12 | ACCION_PERSONAL (parent) | F-05-01 | parent_only — sub-tipos llevan chain | received_by + processed_by trackeados (R8). SLA 120h |
| F12.1 | ACCION_AUMENTO_SALARIO | sub F-05-01 | parallel: supervisor + hr_admin + president | Compensación sensible |
| F12.2 | ACCION_HORAS_EXTRAS | sub F-05-01 | parallel: supervisor + hr_admin + president | Per SOP chain |
| F12.3 | ACCION_PERMISOS | sub F-05-01 | parallel: supervisor + hr_admin + president | Per SOP chain |
| F12.4 | ACCION_DESCUENTO | sub F-05-01 | parallel: supervisor + hr_admin + president | Per SOP chain |
| F12.5 | ACCION_DESPIDO | sub F-05-01 | parallel: supervisor + hr_admin + president | Terminación, audit reforzado |
| F12.6 | ACCION_LIQUIDACION | sub F-05-01 | parallel: supervisor + hr_admin + president | Terminación |
| F13 | ACTUALIZACION_DATOS | F-00-07 | direct_hr_admin | Update `hr.contacts`, `hr.addresses`. SLA 48h |
| F14 | RECLAMO_PAGO | F-05-05 | parallel: supervisor + hr_admin | **SLA 48h per PO-05 §5.11** |
| F15 | PERMISO (laboral horas) | F-00-08 | parallel: supervisor + hr_admin | SLA 48h |
| F16 | REFERENCIA_LABORAL | F-00-06 | direct_hr_admin (workflow inverso) | hr_admin solicita a ex-empleador externo. SLA 120h |
| F17 | ENTREVISTA_SALIDA | F-00-05 | direct_hr_admin | hr_admin con empleado al salir. SLA 72h |
| F18 | CAPACITACION | F-02-09 | parallel: supervisor + hr_admin | SLA 168h |

**Categoría B — Adiciones mercado HRIS líderes (9 tipos nuevos seedeados):**

| # | Tipo | Mode + Chain | Notas |
|---|---|---|---|
| F19 | CARTA_TRABAJO (Carta de Trabajo) | any_of_hr | Más solicitado. SLA 48h. Template ICONSA-branded |
| F20 | CERTIFICACION_LABORAL | any_of_hr | Más formal que constancia, trámites legales. SLA 72h |
| F21 | CONSTANCIA_NO_ADEUDO | any_of_hr | Para finiquito. SLA 72h |
| F22 | COPIA_CONTRATO | any_of_hr | Reposición documento personal. SLA 48h |
| F23 | COPIA_COLILLA | any_of_hr | Comprobante pago, personal de campo lo pide frecuente. SLA 48h |
| F24 | CAMBIO_CUENTA_BANCO | direct_hr_admin | Update banking info, hr_admin valida. SLA 48h |
| F25 | CAMBIO_DEPENDIENTES | direct_hr_admin | Life events (matrimonio, nacimiento). SLA 72h |
| F26 | SOLICITUD_EPP | parallel: supervisor + hr_admin | Sector construcción crítico. SLA 72h |
| F27 | REPORTE_INCIDENTE | parallel: supervisor + hr_admin | Crítico construcción. **SLA 24h** |

### UI tickets (3 features)

| # | Feature | Notas |
|---|---|---|
| F28 | `/solicitudes` con 2 pestañas (Mis solicitudes / Por aprobar), filtros estado, búsqueda, **progress bar por ticket** | Visibility universal — todos los stakeholders ven desde día 0 |
| F29 | `/solicitudes/nueva/[code]` con FormEngine renderizando form_schema | Pre-fetch initialValues de hr.people. Content educativo embebido (ej: D-02 en PRESTAMO) |
| F30 | `/solicitudes/[id]` detalle con timeline, RequestDetailRenderer, actions contextuales por rol (cancel/edit/approve/reject/modify) | Progress bar visible para todos los stakeholders |

### Admin dashboard + features RRHH (1 feature)

| # | Feature | Notas |
|---|---|---|
| F31 | `/admin` dashboard compartido 4 hr_admin + president: tickets pendientes globales, asignación rápida, métricas básicas, accesos rápidos a /admin/empleados, /admin/invites, /admin/tipos, /admin/auditoría | Anti-self-approval enforced (R5). **Vista única** sin segmentación |

### Features extendidas (F32-F39 — esta sesión)

| # | Feature | Notas |
|---|---|---|
| F32 | `/admin/solicitudes/manual-entry` — hr_admin crea solicitud en nombre del empleado con foto del form papel | Crítico personal campo + supervisores acostumbrados al papel. Foto en `files.uploads` con `entity_table='tickets'` + `category='original_paper_form'`. Audit completo |
| F33 | `/settings` — preferencias notificaciones (email/in-app/whatsapp v1.1/sms v1.1), idioma (es/en), contraseña, 2FA opcional, foto perfil | `hr.user_settings` table. Cada usuario configura cómo recibe notificaciones |
| F34 | `/perfil` completo (expansión F6) — expediente digital completo | Datos personales, empleo (history SCD-2), documentos personales, dependientes, contactos emergencia, datos médicos, foto, audit personal, tab Mi Equipo (si has_direct_reports) |
| F35 | Search global cross-entity — barra en topbar busca personas, solicitudes, KB articles, formularios | Resultados categorizados con jump-to-detail |
| F36 | `/notificaciones` inbox in-app con badge contador | Lee `notifications.outbox` filtrado por user. Mark as read, archive |
| F37 | `/admin/auditoría` audit log visible para hr_admin/admin — lee `audit.log` | Filtros por user, entity, fecha. Compliance + debugging |
| F38 | `/solicitudes/[id]/imprimir` — generar PDF formato original SOP para firma física | Casos donde supervisor offline. Foto firmada se sube vía F32 |
| F39 | `/admin/tipos` admin viewer **Nivel A**: lista los 24 tipos, vista detalle por tipo con form_schema visualizado + approval_chain visual (steps con role+SLA) + SOP referencia | Read-only MVP. Samantha ve qué está configurado. Si quiere cambiar, Jaime edita JSONB. Edit JSON raw (Nivel B) → v1.1. Visual editor (Nivel C) → v2 |

**Total features del MVP (primer release usable)**: F1-F39 = **39 features distintas, 24 form variants con sub-tipos**.

---

## Status overall por feature

| Group | Range | Status | Tag |
|---|---|---|---|
| Group 1 — Foundation | F2 (login), F3 (AppShell) | ✅ shipped | v0.0.1 |
| Group 2 — Onboarding | F1 (wizard), F4 (admin nuevo), F5 (admin editar) + F-04-01 emergency/medical + F-01-09 acks + /forgot-password + /perfil + notifications + Vercel Cron | ✅ shipped | v0.0.2 |
| Group 3 — Profile + KB | F6 (perfil base), F7 (perfil editar SCD-2), F8 (directorio), F9 (KB completa GDrive) | 🟡 planning | (próximo) |
| Group 4 — Engines | E1 FormEngine, E2 ApprovalEngine, E3 ChainResolver, E4 StampEngine, E5 PdfEngine, E6 NotificationEngine (LIVE — Resend + Vercel Cron + outbox ya shipped en Group 2) | ⏳ pending | — |
| Group 5 — Forms Cat A | F10-F18 (9 top + 6 sub F-05-01 ACCION_PERSONAL): VACACIONES, PRESTAMO, ACCION_PERSONAL+6, ACTUALIZACION_DATOS, RECLAMO_PAGO, PERMISO, REFERENCIA_LABORAL, ENTREVISTA_SALIDA, CAPACITACION | ⏳ pending | — |
| Group 6 — Forms Cat B | F19-F27 (9 adiciones mercado): CARTA_TRABAJO, CERTIFICACION_LABORAL, CONSTANCIA_NO_ADEUDO, COPIA_CONTRATO, COPIA_COLILLA, CAMBIO_CUENTA_BANCO, CAMBIO_DEPENDIENTES, SOLICITUD_EPP, REPORTE_INCIDENTE | ⏳ pending | — |
| Group 7 — Admin/UI | F28 /solicitudes, F29 /solicitudes/nueva, F30 /solicitudes/[id], F31 /admin dashboard, F32 manual entry, F33 /settings, F34 /perfil completo, F35 search global, F36 /notificaciones, F37 /admin/auditoría, F38 imprimir PDF, F39 /admin/tipos viewer | ⏳ pending | — |

**Pre-requisitos cross-Group**:

- Form schemas JSONB para 16 tipos sin `form_schema` (verificado BD foundation final-check 2026-06-03): VACACIONES, PRESTAMO, ACCION_PERSONAL+6 subtipos, PERMISO, CARTA_TRABAJO, RECLAMO_PAGO, ACTUALIZACION_DATOS, ENTREVISTA_SALIDA, REFERENCIA_LABORAL, CAPACITACION. Workflow propio con skill `iconsa-form-implementation` (SOP por SOP) antes de Group 5+.
- `requests.next_sequence() SECURITY DEFINER` bumper para `requests.sequences` antes de Group 4 — actual policy_count=0 va a fallar primer ticket si no se crea el definer (per audit 2026-05-28 P1.4 → reclasificado checklist Group 3).

---

## Lo que NO entra en el MVP (diferido)

- Documenso firma legal — v1.1 (schema preparado)
- Personal de campo SMS/WhatsApp auth via Twilio — v1.1
- Onboarding workflow completo F-01-09 con contrato firmado, EPP, certificados médicos, lista capacitaciones inducción (`workflows.*` schema) — Fase 2
- Performance reviews module (`performance.*` schema) — v2
- Learning module completo (`learning.*` schema) — v2
- F-05-04 Memo Amonestación — v2 (`hr.disciplinary_actions`)
- F-03-03, F-03-04 Evaluaciones — `performance.*`
- F-02-04, F-02-05, F-02-07 Capacitación records — `learning.*`
- F-00-01 Alcoholímetro (SSOA, no HumanOS)
- F-00-02, F-00-03 Matrices PNC/NC (Calidad, no HumanOS)
- F-00-04 Entrega Combustible (Logística/MovimientOS)
- F-01-08 Solicitud Empleo (Recruiting/ATS — v3 lejano)
- CMS interno (blogs, news, videos educativos) — v2
- Calendario compartido vacaciones (Who's Out) — v1.1
- Surveys / feedback continuo — v2
- AI assistant chatbot — v2 si justifica
- Recognition programs — v2
- Scheduling / shift management — v2 si Samantha lo pide
- PWA service worker offline-first — v1.1
- 2FA obligatorio hr_admin — v1.1
- **F39-B edit JSON raw** approval_chains — v1.1
- **F39-C visual editor** approval_chains — v2

El roadmap detallado de lo diferido (inmediato post-MVP, v1.1, v2, v2+) vive en la sección **"Roadmap post-MVP"** más abajo en este doc.

---

## Decisiones de scope confirmadas

- El MVP (primer release usable) cubre **18 tipos top-level** (9 categoría A + 9 categoría B) = **24 form variants** con sub-tipos
- Sign-up flow con invite codes cubre F-04-01 Info Emergencia + F-01-09 simplificado
- Engines genéricos primero, forms después (JTBD vertical slicing)
- PDF original solo para los 9 tipos con SOP en GDrive (categoría A). Categoría B usa template genérico ICONSA-branded
- Sello aprobación simple con stamp_data jsonb. Documenso v1.1
- Email + in-app notifications vía Resend + notifications.outbox. Usuario configura preferencia F33
- Mobile-first responsive, NO PWA service worker (v1.1)
- Tests obligatorios: tsc + lint + Playwright E2E happy path + RLS validation por feature
- Trabajo directo en `main` (greenfield, sin users productivos). Si Code rompe build → revert commits específicos
- Code tiene acceso BD completo en schemas permitidos
- **Approval workflow paralelo total** — RRHH desde día 0, president incluido día 0 cuando aplica (per SOP)
- KB completa de la carpeta RRHH (no solo lista 18 tipos)
- Manual entry F32 crítico para realidad operacional ICONSA
- Search global F35, Notifications inbox F36, Audit log F37, Settings F33, Profile robusto F34, Admin viewer chains F39 — todos MVP

---

## Criterios de aceptación del MVP (primer release usable) completo

El MVP (primer release usable) se considera completo cuando:

- 39 features F1-F39 implementadas (cada una con tests E2E happy path en verde)
- `npx tsc --noEmit` 0 errors
- `npm run lint` 0 errors
- `npm run build` success
- Playwright E2E suite full pass
- RLS validation queries todas pasan
- Docs vivos actualizados: `../CHANGELOG.md` con entries por feature, `../CONTEXT.md` con vocabulary, `../adr/` con decisiones técnicas
- Commit log estructurado en `main` con prefijos conventional (`feat:`, `fix:`, `chore:`, `docs:`)
- Deploy preview Vercel funcional accesible
- KB completa RRHH migrada (PDFs + markdown extraídos)
- Smoke tests bedrock (pre-ejecución de plan) pasaron

Si una pasada no completa todo: la tabla "Status overall por feature" de este doc + `../STATUS.md` reflejan qué quedó hecho vs pendiente. Iteración humano-en-loop continúa desde donde quedó.

---

## Roadmap post-MVP

> Esta sección absorbe el antiguo roadmap post-MVP (D3 merge). El MVP es la base; la iteración humano-en-loop refina con uso real. El roadmap NO promete fechas — orden de prioridad y dependencias.

### Inmediato post-MVP (iteración humano)

1. **QA con Samantha y equipo HR** — usar sistema real con tickets reales sintéticos
2. **Refinamiento UI** — copy específico, micro-interacciones, casos edge encontrados
3. **PDF templates exactos** — pixel-perfect match contra SOPs originales para los 9 categoría A
4. **Smoke testing personal campo** — sign-up vía hr_admin asistido + WhatsApp delivery invite codes
5. **Bug bash** — encontrar regresiones con datos reales 370 personas
6. **Capacitación equipo HR** — sesiones con Samantha, Rocío, Milagros, Jerelyn
7. **Decisión Gerencia ≠ President** con Samantha:
   - ¿VP Ferrer debe aprobar en `parallel` mode junto a Rodrigo?
   - ¿Otros gerentes (Finanzas, Proyectos) en algún tipo?
   - Si sí: implementar resolver `gerencia_user_list` con array UUIDs
8. **Adjustar chains via F39 read-only viewer** — Samantha ve qué está configurado, Jaime edita JSONB raw si necesita

### v1.1 (siguiente release)

#### Auth + UX

- **Twilio integration**: SMS OTP para sign-up personal sin email + WhatsApp Business API para envío invite codes + notificaciones
- **PWA service worker offline-first**: tickets se guardan local si no hay conectividad, sync cuando vuelva
- **2FA obligatorio para hr_admin**: TOTP via authenticator app
- **Kiosk mode PIN-only**: tablet compartido en obra, workers se autentican con employee_code + PIN corto. Pattern Arcoro

#### Approval chains

- **F39-B Edit JSON raw chains**: editor de texto con JSON validado server-side para Samantha/Jaime avanzados
- **Calendario compartido vacaciones (Who's Out)**: vista mensual de aprobadas, conflict detection
- **Resolver `gerencia_user_list`**: chains con array UUIDs en paralelo (no solo `president_user`)

#### Documentos legales

- **Documenso integration**: firma legal LATAM-compliant para PDFs aprobados
- **Templates ICONSA-branded**: header con logo + footer con datos empresa + watermark "DIGITAL" en docs sin Documenso

#### Notifications

- **Email rich templates**: HTML con branding ICONSA + CTA buttons
- **In-app push notifications**: WebPush API
- **WhatsApp Business notifications**: per usuario preferencia (F33 ya prevé el flag)

#### Self-service

- **Self-signup wizard**: empleado puede self-registrarse sin invite_code, entra en estado `pending_hr_review`, hr_admin aprueba

### v2 (siguiente versión mayor)

#### Workflows

- **Onboarding workflow completo** (`workflows.onboarding_*`): F-01-09 contrato + EPP + certificados médicos + lista capacitaciones inducción + acknowledgments + signatures. Pipeline visual progress
- **Offboarding workflow**: cuenta exit interview + checklist devolución equipo + carta no adeudo automática + revoke access
- **Time Off advanced**: PTO accruals, multi-day partial requests, integración nómina automática

#### Performance reviews

- **`performance.reviews` module**: F-03-03 y F-03-04 implementados
- 360 reviews, self-assessments, goals OKR-style

#### Learning

- **`learning.*` module completo**: F-02-04, F-02-05, F-02-07 implementados
- Trainings catalog, attendance tracking, certifications expiry alerts
- Integration con e-learning externo (LMS)

#### Disciplinary

- **`hr.disciplinary_actions`**: F-05-04 Memo Amonestación + escalation paths + audit trail

#### Recruiting (lejano)

- **F-01-08 Solicitud Empleo**: ATS básico, job postings, candidate tracking. v3 si justifica

### v2+ futuro (visión a largo)

- **F39-C Visual editor approval chains**: drag-drop steps, dropdowns resolver, sliders SLA, condicionales visuales. Pattern Workday/ServiceNow workflow designer
- **AI assistant chatbot**: Claude integrado para consultas RRHH ("¿cuántos días de vacaciones me quedan?", "¿cómo solicito un préstamo?")
- **Recognition programs**: kudos, awards, milestones
- **Surveys & feedback continuo**: pulse surveys, engagement
- **Scheduling / shift management**: si Samantha lo pide y aplica a construcción
- **Mobile native app**: si PWA no es suficiente
- **CMS interno**: blogs, news, videos educativos para empleados
- **Integration MDM cross-app**: convergence Spectrum + MovimientOS + HumanOS → single source person canonical

### Dependencias clave

| Feature v1.1+ | Depende de |
|---|---|
| Documenso | Cuenta Documenso + API key + legal review LATAM |
| Twilio | Cuenta Twilio + budget per SMS + WhatsApp Business Number approval |
| Onboarding workflow | hr_admin definiendo checklist canónico ICONSA |
| Performance reviews | Samantha defining frequency + template + scoring rubric |
| MDM convergence | Otra app ICONSA pidiéndolo (Calidad o SSOA lanzando) |

### Decisión "Gerencia General" post-MVP

Una vez Samantha use el sistema real, validar con ella:

**Pregunta abierta**: "Gerencia General" en cada SOP específicamente refiere a:
- ✅ Solo Rodrigo (Presidente)?
- ➕ Rodrigo + Javier Ferrer (VP)?
- ➕ Rodrigo + VP + gerente del área específica del solicitante?

**Implementación según respuesta**:
- Si solo Rodrigo: NO cambio
- Si Rodrigo + VP: actualizar `app_role` de Ferrer a 'president' OR crear nuevo rol 'executive' con resolver `executive_user_list`
- Si depende del área: lógica más compleja, configurable via JSONB chain template

Este pendiente bloquea: nada (sistema funciona con Rodrigo único MVP). Mejora UX para Samantha: incluye más voces aprobadoras donde corresponde.
