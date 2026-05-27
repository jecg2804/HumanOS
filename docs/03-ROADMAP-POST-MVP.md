# 03-ROADMAP-POST-MVP.md — Qué viene después de overnight #1

**Última actualización**: 2026-05-27 (F39-B/C en v1.1 + decisiones sesión)

---

## Filosofía

Overnight #1 entrega base sólida. Iteración humano-en-loop refina con uso real. Roadmap NO promete fechas — orden de prioridad y dependencias.

---

## Inmediato post-overnight (iteración humano)

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
8. **Adjustar chains via F39 read-only viewer** — Samantha ve qué está configurado, James edita JSONB raw si necesita

---

## v1.1 (siguiente release)

### Auth + UX

- **Twilio integration**: SMS OTP para sign-up personal sin email + WhatsApp Business API para envío invite codes + notificaciones
- **PWA service worker offline-first**: tickets se guardan local si no hay conectividad, sync cuando vuelva
- **2FA obligatorio para hr_admin**: TOTP via authenticator app
- **Kiosk mode PIN-only**: tablet compartido en obra, workers se autentican con employee_code + PIN corto. Pattern Arcoro

### Approval chains

- **F39-B Edit JSON raw chains**: editor de texto con JSON validado server-side para Samantha/James avanzados
- **Calendario compartido vacaciones (Who's Out)**: vista mensual de aprobadas, conflict detection
- **Resolver `gerencia_user_list`**: chains con array UUIDs en paralelo (no solo `president_user`)

### Documentos legales

- **Documenso integration**: firma legal LATAM-compliant para PDFs aprobados
- **Templates ICONSA-branded**: header con logo + footer con datos empresa + watermark "DIGITAL" en docs sin Documenso

### Notifications

- **Email rich templates**: HTML con branding ICONSA + CTA buttons
- **In-app push notifications**: WebPush API
- **WhatsApp Business notifications**: per usuario preferencia (F33 ya prevé el flag)

### Self-service

- **Self-signup wizard**: empleado puede self-registrarse sin invite_code, entra en estado `pending_hr_review`, hr_admin aprueba

---

## v2 (siguiente versión mayor)

### Workflows

- **Onboarding workflow completo** (`workflows.onboarding_*`): F-01-09 contrato + EPP + certificados médicos + lista capacitaciones inducción + acknowledgments + signatures. Pipeline visual progress
- **Offboarding workflow**: cuenta exit interview + checklist devolución equipo + carta no adeudo automática + revoke access
- **Time Off advanced**: PTO accruals, multi-day partial requests, integración nómina automática

### Performance reviews

- **`performance.reviews` module**: F-03-03 y F-03-04 implementados
- 360 reviews, self-assessments, goals OKR-style

### Learning

- **`learning.*` module completo**: F-02-04, F-02-05, F-02-07 implementados
- Trainings catalog, attendance tracking, certifications expiry alerts
- Integration con e-learning externo (LMS)

### Disciplinary

- **`hr.disciplinary_actions`**: F-05-04 Memo Amonestación + escalation paths + audit trail

### Recruiting (lejano)

- **F-01-08 Solicitud Empleo**: ATS básico, job postings, candidate tracking. v3 si justifica

---

## v2+ futuro (visión a largo)

- **F39-C Visual editor approval chains**: drag-drop steps, dropdowns resolver, sliders SLA, condicionales visuales. Pattern Workday/ServiceNow workflow designer
- **AI assistant chatbot**: Claude integrado para consultas RRHH ("¿cuántos días de vacaciones me quedan?", "¿cómo solicito un préstamo?")
- **Recognition programs**: kudos, awards, milestones
- **Surveys & feedback continuo**: pulse surveys, engagement
- **Scheduling / shift management**: si Samantha lo pide y aplica a construcción
- **Mobile native app**: si PWA no es suficiente
- **CMS interno**: blogs, news, videos educativos para empleados
- **Integration MDM cross-app**: convergence Spectrum + MovimientOS + HumanOS → single source person canonical

---

## Dependencias clave

| Feature v1.1+ | Depende de |
|---|---|
| Documenso | Cuenta Documenso + API key + legal review LATAM |
| Twilio | Cuenta Twilio + budget per SMS + WhatsApp Business Number approval |
| Onboarding workflow | hr_admin definiendo checklist canónico ICONSA |
| Performance reviews | Samantha defining frequency + template + scoring rubric |
| MDM convergence | Otra app ICONSA pidiéndolo (Calidad o SSOA lanzando) |

---

## Decisión "Gerencia General" post-MVP

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
