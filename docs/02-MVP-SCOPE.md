# 02-MVP-SCOPE.md — Scope detallado overnight #1

**Última actualización**: sesión 2026-05-27 (modes finales + F39 admin viewer chains Nivel A + decisiones SOP-driven + BD ready post-migrations)

**Owner update**: Claude Chat. Auditar cada feature contra Supabase real + repomix antes de cerrar el MVP scope.

---

## Filosofía del MVP

**Overnight #1 entrega un SHELL FUNCIONAL completo end-to-end**, no perfección de cada feature. Es la base sobre la cual iteración humana posterior refina UI, edge cases, copy específico.

Construye **engines genéricos** + **first pass de cada feature** + **happy paths verificados con E2E**. Refinamiento granular es iteración humano-en-loop post-overnight.

**MVP completo confirmado por James**: 39 features F1-F39. NO subset.

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

**Comportamiento por mode**:

| Mode | Estado terminal | Notificación día 0 |
|---|---|---|
| `parallel` | Aprobada cuando TODOS los steps required = approved. Rechazada si ALGUNO = rejected | A todos los stakeholders simultáneamente (visibility universal) |
| `direct_hr_admin` | Aprobada cuando 1 hr_admin actúa | A todos los hr_admin (4 personas) |
| `any_of_hr` | Aprobada cuando 1 hr_admin actúa (idéntico a direct_hr_admin, semantic distinction para documentos) | A todos los hr_admin |
| `parent_only` | Sin chain (tipo parent — sub-tipos llevan el chain real) | Ninguna |

**RRHH SIEMPRE incluido desde día 0** en todos los modes excepto `parent_only`.

---

## Mapping definitivo tipos → mode (24 tipos verificados en BD)

### parallel con president (8 tipos per SOP)

| Tipo | SLA | Stakeholders paralelos |
|---|---|---|
| PRESTAMO | 72h | supervisor + hr_admin + president |
| VACACIONES | 72h | supervisor + hr_admin + president |
| ACCION_AUMENTO_SALARIO | 120h | supervisor + hr_admin + president |
| ACCION_DESPIDO | 120h | supervisor + hr_admin + president |
| ACCION_LIQUIDACION | 120h | supervisor + hr_admin + president |
| ACCION_HORAS_EXTRAS | 120h | supervisor + hr_admin + president |
| ACCION_PERMISOS | 120h | supervisor + hr_admin + president |
| ACCION_DESCUENTO | 120h | supervisor + hr_admin + president |

### parallel sin president (5 tipos, SOP no incluye gerencia)

| Tipo | SLA | Stakeholders |
|---|---|---|
| PERMISO (horas) | 48h | supervisor + hr_admin |
| RECLAMO_PAGO | 48h | supervisor + hr_admin (SLA 48h per PO-05 §5.11) |
| CAPACITACION | 168h | supervisor + hr_admin |
| SOLICITUD_EPP | 72h | supervisor + hr_admin |
| REPORTE_INCIDENTE | 24h | supervisor + hr_admin |

### any_of_hr (5 tipos documentos)

CARTA_TRABAJO (48h), CERTIFICACION_LABORAL (72h), CONSTANCIA_NO_ADEUDO (72h), COPIA_CONTRATO (48h), COPIA_COLILLA (48h).

### direct_hr_admin (5 tipos)

ACTUALIZACION_DATOS (48h), CAMBIO_CUENTA_BANCO (48h), CAMBIO_DEPENDIENTES (72h), REFERENCIA_LABORAL (120h, RRHH inicia), ENTREVISTA_SALIDA (72h, RRHH inicia).

### parent_only (1 tipo)

ACCION_PERSONAL (parent — sub-tipos llevan el chain real).

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
| F39 | `/admin/tipos` admin viewer **Nivel A**: lista los 24 tipos, vista detalle por tipo con form_schema visualizado + approval_chain visual (steps con role+SLA) + SOP referencia | Read-only MVP. Samantha ve qué está configurado. Si quiere cambiar, James edita JSONB. Edit JSON raw (Nivel B) → v1.1. Visual editor (Nivel C) → v2 |

**Total features MVP overnight #1**: F1-F39 = **39 features distintas, 24 form variants con sub-tipos**.

---

## Lo que NO entra en overnight #1 (diferido)

- Documenso firma legal — v1.1 (schema preparado)
- Personal de campo SMS/WhatsApp auth via Twilio — v1.1
- Onboarding workflow completo F-01-09 con contrato firmado, EPP, certificados médicos, lista capacitaciones inducción (`workflows.*` schema) — overnight #2
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

Detalle en `03-ROADMAP-POST-MVP.md`.

---

## Decisiones de scope confirmadas

- MVP overnight #1 cubre **18 tipos top-level** (9 categoría A + 9 categoría B) = **24 form variants** con sub-tipos
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

## Criterios de aceptación overnight #1 completo

Output `<promise>MVP_COMPLETE</promise>` cuando:

- 39 features F1-F39 implementadas (cada una con tests E2E happy path en verde)
- `npx tsc --noEmit` 0 errors
- `npm run lint` 0 errors
- `npm run build` success
- Playwright E2E suite full pass
- RLS validation queries todas pasan
- Docs vivos actualizados: `docs/CHANGELOG.md` con entries por feature, `docs/CONTEXT.md` con vocabulary, `docs/adr/` con decisiones técnicas
- Commit log estructurado en `main` con prefijos conventional (`feat:`, `fix:`, `chore:`, `docs:`)
- Deploy preview Vercel funcional accesible
- KB completa RRHH migrada (PDFs + markdown extraídos)
- Smoke tests bedrock pre-overnight pasaron

Si overnight no completa todo: `docs/ROADMAP.md` refleja qué quedó hecho vs pendiente. Iteración humano-en-loop continúa desde donde quedó.
