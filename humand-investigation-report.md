# Humand Investigation Report — ICONSA Instance

**Fecha:** 2026-04-07
**URL:** https://app.humand.co
**Cuenta:** skosmas@iconsanet.com (Samantha Kosmas)
**Comunidad:** Ingeniería Continental
**Screenshots:** `docs/humand-screenshots/` (28 capturas)

---

## 1. App Structure Map

```
app.humand.co/
├── feed                          # Social feed (home)
├── [Groups panel]                # Side panel, no URL change
│   ├── Direccion
│   └── Onboarding
├── news                          # Magazine — artículos/blog interno
├── conversations                 # Chats — mensajería interna
├── library                       # Knowledge libraries
│   ├── Beneficios
│   ├── Equilibrio y Salud
│   ├── Vacantes Internas
│   ├── Políticas
│   ├── Calendario
│   ├── Objetivos
│   ├── Plan de carrera
│   ├── Reservas
│   └── Acerca de Humand
├── events                        # Eventos corporativos
├── service-portal                # Portal de servicios (solicitudes HR)
│   └── service-items             # Catálogo de servicios (~13 formularios)
├── acknowledgements              # Kudos — reconocimiento peer-to-peer
├── forms                         # Forms and Tasks (~10 formularios)
├── vacations                     # Time off — ausencias/vacaciones
├── performance                   # Evaluaciones de desempeño
├── goals                         # OKRs / Objetivos
├── people                        # Directorio de personas (191)
├── org-chart                     # Organigrama visual
├── files                         # File manager compartido
├── courses                       # LMS — cursos online
│   ├── [Paths]
│   └── [Sessions]
├── employee-lifecycle/
│   ├── onboardings               # Onboarding (NEW)
│   └── tasks                     # Tasks (NEW)
├── onboarding                    # Onboarding (legacy, duplicado)
├── [People Experience submenu]   # Expandible, sub-items no explorados
├── surveys                       # Encuestas (~16 configuradas)
├── documents                     # My documents (recibos, contratos)
├── marketplace                   # Marketplace interno (compra/venta)
└── [Quick links]                 # Enlaces rápidos

admin.humand.co/
├── insights                      # Analytics (Posts created, Widgets opened)
├── [Earn HuCoins]                # Gamificación
└── [Shortcuts]                   # Quick links admin
```

**Nota:** La cuenta skosmas no tiene acceso al admin panel completo. Solo ve Insights, Earn HuCoins, y Shortcuts.

---

## 2. Module Inventory

### 2.1 — Feed (Red social interna)
- **URL:** `/feed`
- **Screenshot:** `01-feed-dashboard.png`
- **Propósito:** Muro social tipo Facebook/LinkedIn. Publicaciones, GIFs, encuestas, livestream.
- **UX:** Post composer con foto/GIF/archivo/encuesta/livestream + botón Post. Feed cronológico con cards. Sección "Celebrations" colapsible. "Key updates" banner arriba.
- **Datos:** Posts con autor, fecha, audiencia ("All the organization"), reach (191), límite 100MB adjuntos.
- **Configurado para ICONSA:** ✅ Activo — posts de "Ingeniería Continental Comunicaciones" sobre RSE.

### 2.2 — Groups
- **URL:** Panel lateral (no cambia URL)
- **Screenshot:** `03-groups-panel.png`
- **Propósito:** Comunidades internas segmentadas.
- **Grupos:** "Direccion", "Onboarding". Búsqueda + Manage.
- **Configurado:** ✅ Mínimo — solo 2 grupos.

### 2.3 — Magazine
- **URL:** `/news`
- **Screenshot:** `04-magazine-news.png`
- **Propósito:** Blog/noticias internas con categorías y tags.
- **UX:** Grid de cards con imagen, título, fecha, tags, comentarios. Filter chips: Beneficios, Caso de Éxito, Emprendimiento, Equipo, Evento, Éxito, Expansión, HR, Logro, Personas.
- **Configurado:** ✅ Activo — artículos de Humand (demo content, no propio de ICONSA).

### 2.4 — Chats
- **URL:** `/conversations`
- **Screenshot:** `24-chats.png`
- **Propósito:** Mensajería interna tipo WhatsApp/Slack.
- **Features:** + New, search, read receipts ("Read by"), 1:1 y grupos.
- **Configurado:** ✅ Disponible.

### 2.5 — Knowledge Libraries
- **URL:** `/library`
- **Screenshot:** `16-knowledge-library.png`
- **Propósito:** Wiki/base de conocimiento organizada por categorías.
- **Categorías:** Beneficios, Equilibrio y Salud, Vacantes Internas, Políticas, Calendario, Objetivos, Plan de carrera, Reservas, Acerca de Humand.
- **Configurado:** ✅ Activo — 9 categorías configuradas.

### 2.6 — Events
- **URL:** `/events`
- **Screenshot:** `15-events.png`
- **Propósito:** Eventos corporativos con RSVP.
- **UX:** Tabs: My events, Invitations, Past, Organized by me. + Create event.
- **Configurado:** ⚠️ Vacío — sin eventos activos.

### 2.7 — Service Portal ⭐ (CRÍTICO PARA HUMANOS)
- **URL:** `/service-portal`
- **Screenshots:** `05-service-portal.png`, `06-service-catalog.png`, `08-service-form-afiliacion.png`
- **Propósito:** Sistema de tickets/solicitudes internas con workflow de aprobación.
- **UX:** "Service catalog" → cards de servicios → formulario wizard → tracking. "My requests" con búsqueda + filtros.
- **Categorías:** Consultoría, Documentos, Equipo de..., Finanzas, Generales, Indumentaria, Jornada, Mantenimiento, Marketing, Personal, Reclutamiento, Referidos.
- **Servicios configurados (~13):**
  - Actualización de Datos Personales (×2 versiones)
  - Afiliación de nuevo empleado
  - Almuerzo Semanal
  - Alta de seguro de vida
  - Alta de software para nuevo empleado
  - Cambio de turno definitivo
  - Canal de denuncias
  - Carta de Renuncia
  - Certificado de empleo
  - Consultas generales
  - Declaración Jurada de Domicilio
- **Requests activas:** SR9 (Afiliación), SR8 (Revisión equipo), SR7 (Viáticos) — todas "Unassigned".
- **Configurado:** ✅ MUY ACTIVO — el módulo más usado de HR.

### 2.8 — Kudos
- **URL:** `/acknowledgements`
- **Screenshot:** `19-kudos.png`
- **Propósito:** Reconocimiento peer-to-peer con puntos y ranking.
- **UX:** Feed de reconocimientos con categorías ("Trabajo en equipo"), puntos (+20), avatares. Ranking mensual (POS, NAME, POINTS).
- **Configurado:** ✅ Activo — posts de reconocimiento visibles.

### 2.9 — Forms and Tasks
- **URL:** `/forms`
- **Screenshot:** `14-forms-tasks.png`
- **Propósito:** Formularios digitales para procesos internos.
- **UX:** Tabs Available/Completed. Lista de formularios con menú contextual (⋯).
- **Formularios configurados (~10):**
  - Solicitud de Carta de Trabajo
  - Requisición de personal
  - Solicitud de Uniforme
  - R-GGC-V01-22 Solicitud Anticipo
  - ACLARACIÓN DE NÓMINA
  - Cambio de turno definitivo
  - Reporte de incidente laboral
  - Buzón de sugerencias
  - Certificados laborales
  - Registro de equipos (uso y finalización)
- **Configurado:** ✅ MUY ACTIVO — 10 formularios operativos.

### 2.10 — Time Off ⭐ (CRÍTICO PARA HUMANOS)
- **URL:** `/vacations`
- **Screenshot:** `09-time-off.png`
- **Propósito:** Gestión de ausencias, vacaciones, permisos.
- **UX:** Tabs Requests/Calendar. Cards de tipos de ausencia con balance (días usados/disponibles). Tabla de requests con status.
- **Tipos configurados:** Descanso médico (0 usados), Días de estudio (9 disponibles), Licencia por maternidad (0 usados), + más con scroll.
- **Columnas tabla:** Request type, Status, Requested on, Date range.
- **Configurado:** ✅ Activo con tipos y balances.

### 2.11 — Performance
- **URL:** `/performance`
- **Screenshot:** `12-performance.png`
- **Propósito:** Evaluaciones de desempeño por ciclos.
- **UX:** Lista de ciclos de evaluación asignados.
- **Configurado:** ⚠️ Vacío — "You don't have any evaluation cycles assigned yet."

### 2.12 — Goals
- **URL:** `/goals`
- **Screenshot:** `13-goals.png`
- **Propósito:** OKRs / Objetivos por ciclo.
- **UX:** Tabs My goals/General. Progress % por persona. Cycle filter. Create goal + Edit weight.
- **Configurado:** ⚠️ Vacío — "No goals. This collaborator has no objectives assigned."

### 2.13 — People (Directorio) ⭐
- **URL:** `/people`
- **Screenshot:** `10-people-directory.png`
- **Propósito:** Directorio de empleados con búsqueda.
- **UX:** Tabla con Name, Email, Hiring date. Actions: Send message, ver org chart. Tabs People/Org chart.
- **Datos:** 191 personas registradas.
- **Configurado:** ✅ Activo — 191 personas con datos.

### 2.14 — Org Chart
- **URL:** `/org-chart`
- **Screenshot:** `11-org-chart.png`
- **Propósito:** Organigrama visual interactivo.
- **UX:** Canvas con cards de personas, zoom +/-, búsqueda, "Highlight By", "Card content" options.
- **Configurado:** ✅ Activo — muestra estructura de Samantha Kosmas.

### 2.15 — Files
- **URL:** `/files`
- **Screenshot:** `21-files.png`
- **Propósito:** File manager compartido (tipo Google Drive).
- **UX:** Tabla con Title, Creator, Last modified, Size. Folders + archivos.
- **Contenido:** Folders: Eventos, Legales, Marketing, RR. HH. + 1 PDF (MenuRestoBar!.pdf).
- **Configurado:** ✅ Mínimo — 5 items.

### 2.16 — Learning (LMS) ⭐
- **URL:** `/courses`
- **Screenshot:** `23-courses-lms.png`
- **Propósito:** Sistema de capacitación con cursos, paths, sesiones.
- **UX:** Sidebar de categorías, tabs All/Pending/In progress/Finished, búsqueda, filter. Cards de cursos con progreso %, badge Required/Optional.
- **Categorías:** Ciberseguridad, Comunicación (3), Habilidades blandas, Herramientas digitales (2).
- **Cursos visibles:** "Curso Básico de Ciberseguridad" (Required, 0%), "Capacitación en Habilidades Blandas" (Optional).
- **Sub-secciones:** Courses, Paths, Sessions.
- **Configurado:** ✅ Activo — cursos reales configurados.

### 2.17 — Onboarding
- **URL:** `/employee-lifecycle/onboardings`
- **Screenshot:** `20-onboarding-lifecycle.png`
- **Propósito:** Procesos de inducción para nuevos empleados.
- **UX:** Búsqueda + filter chips (All/Not started/In progress/Completed). "Active processes" list.
- **Configurado:** ⚠️ Vacío — sin procesos activos.

### 2.18 — Surveys ⭐
- **URL:** `/surveys`
- **Screenshot:** `17-surveys.png`
- **Propósito:** Encuestas de clima, compliance, feedback.
- **UX:** Tabs Available/Completed. Lista de encuestas con búsqueda. Badge "16" en nav indica 16 pendientes.
- **Encuestas configuradas (~16):**
  - Factores de riesgo psicosocial en el trabajo
  - Factores de riesgo psicosocial y entorno organizacional
  - Canal de denuncias anónimo
  - NPS Interno
  - Cuestionario sobre Acontecimientos Traumáticos Severos
  - Vacunación
  - Encuesta de capacitaciones | 2023
  - ¿Cómo te sientes hoy?
  - Encuesta de satisfacción laboral | 2023
  - Automonitoreo de síntomas
  - Feedback a jef@
- **Configurado:** ✅ MUY ACTIVO — 16 encuestas, mix de compliance y engagement.

### 2.19 — My Documents
- **URL:** `/documents`
- **Screenshot:** `18-my-documents.png`
- **Propósito:** Documentos personales del empleado (recibos, contratos).
- **UX:** Folders structure.
- **Configurado:** ⚠️ Vacío — "No folders."

### 2.20 — Marketplace
- **URL:** `/marketplace`
- **Screenshot:** `22-marketplace.png`
- **Propósito:** Compra/venta entre empleados (tipo Facebook Marketplace).
- **UX:** "Create post to sell", feed de posts con precio, descripción, foto, Contact button. "My posts" collapsible.
- **Configurado:** ✅ Con actividad — al menos 1 post (libro $500).

### 2.21 — Sammy AI (Chatbot)
- **Screenshot:** `25-sammy-ai-chatbot.png`
- **Propósito:** Asistente virtual con IA.
- **UX:** Floating button → chat panel. Saluda por nombre: "¡Hola Samantha Kosmas! 👋 Soy Sammy, tu asistente con IA."
- **Configurado:** ✅ Activo.

### 2.22 — Admin Panel (Limitado)
- **URL:** `admin.humand.co`
- **Screenshots:** `27-admin-dashboard.png`, `28-admin-sidebar-expanded.png`
- **Propósito:** Analytics y configuración del back-office.
- **Acceso con esta cuenta:** Solo Insights (Posts created, Widgets opened), Earn HuCoins, Shortcuts.
- **Nota:** Admin full requiere un rol más elevado. No se pudo explorar configuración completa.

---

## 3. Form Catalog

### Service Portal Forms (con categorías)

| # | Formulario | Categoría | Campos visibles | Tipo |
|---|-----------|-----------|-----------------|------|
| 1 | Actualización de Datos Personales | Personal | Datos personales | Wizard |
| 2 | Actualización de datos personales (v2) | Personal | Dirección, teléfono, correo | Wizard |
| 3 | Afiliación de nuevo empleado | Personal | Nombre(s), Apellido(s), + pasos | Wizard multi-step |
| 4 | Almuerzo Semanal | Generales | Pedido de almuerzos semanales | Wizard |
| 5 | Alta de seguro de vida | Personal | Seguro + familiares | Wizard |
| 6 | Alta de software para nuevo empleado | Equipo | Licencias y config | Wizard |
| 7 | Cambio de turno definitivo | Jornada | Turno actual → nuevo | Wizard |
| 8 | Canal de denuncias | Generales | Queja/denuncia segura | Wizard |
| 9 | Carta de Renuncia | Personal | Nombre, datos de renuncia | Wizard |
| 10 | Certificado de empleo | Documentos | Puesto, antigüedad | Wizard |
| 11 | Consultas generales | Consultoría | Consulta libre | Wizard |
| 12 | Declaración Jurada de Domicilio | Documentos | Ubicación física | Wizard |

### Forms and Tasks

| # | Formulario | Tipo |
|---|-----------|------|
| 1 | Solicitud de Carta de Trabajo | Form |
| 2 | Requisición de personal | Form |
| 3 | Solicitud de Uniforme | Form |
| 4 | R-GGC-V01-22 Solicitud Anticipo | Form (con código SOP) |
| 5 | ACLARACIÓN DE NÓMINA | Form |
| 6 | Cambio de turno definitivo | Form (duplicado con Service Portal) |
| 7 | Reporte de incidente laboral | Form |
| 8 | Buzón de sugerencias | Form |
| 9 | Certificados laborales | Form |
| 10 | Registro de equipos (uso y finalización) | Form |

**Nota:** Hay duplicación entre Service Portal y Forms and Tasks (ej: "Cambio de turno definitivo" aparece en ambos).

---

## 4. UX Patterns

### Navegación
- **Sidebar fijo** a la izquierda con icons + texto
- **Submenús colapsibles** (Learning, People Experience, Quick links)
- **Tabs** dentro de módulos (Available/Completed, Requests/Calendar, My goals/General)
- **Admin panel separado** en subdomain (admin.humand.co)
- **Floating chatbot button** (abajo-izquierda)

### Listas/Tablas
- **Cards** para feed, magazine, kudos, marketplace, cursos
- **Tables** para people directory, files, time off requests
- **Lists** para forms, surveys, service catalog items

### Formularios
- **Wizard multi-step** con Back/Continue (service portal)
- **Single-page forms** (forms and tasks)
- **Campos estándar:** text, textarea, date, select, file upload, number

### Status/Badges
- **Unassigned** (gris) para requests sin asignar
- **Required/Optional** (rojo/gris) para cursos
- **New** (azul) para features nuevas (Onboarding, Tasks)
- **Count badges** en nav (Surveys 16)

### Comunicación
- **Posts** con rich text, GIF, archivos, encuestas, livestream
- **Comments** en magazine y feed
- **Read receipts** en chats
- **Reactions** (kudos)
- **AI chatbot** (Sammy)

### Mobile
- Sidebar colapsa a hamburger menu
- Cards stack vertically
- Touch-friendly buttons

---

## 5. Key Insights for HumanOS

### ✅ REPLICAR (Alto valor para ICONSA)

| Módulo | Razón | Prioridad |
|--------|-------|-----------|
| **Service Portal** | El módulo más configurado. 13 formularios reales de RRHH. Workflow de aprobación. ICONSA ya lo usa. | P0 |
| **Time Off** | Tipos de ausencia configurados, balances, calendario. Necesidad operativa real. | P0 |
| **People Directory** | 191 personas — base compartida con MovimientOS. Org chart visual. | P0 |
| **Forms and Tasks** | 10 formularios operativos (Solicitud Anticipo, Reporte Incidente, etc.). | P1 |
| **Surveys** | 16 encuestas activas. Compliance (riesgo psicosocial, denuncias) + engagement. | P1 |
| **LMS / Courses** | Cursos Required/Optional con tracking de progreso. | P2 |
| **Onboarding** | Proceso estructurado para nuevos empleados. Aún vacío pero la infraestructura existe. | P2 |
| **My Documents** | Recibos de nómina, contratos, certificados. Autoservicio del empleado. | P2 |

### ⚠️ CONSIDERAR (Valor medio, no urgente)

| Módulo | Razón |
|--------|-------|
| **Knowledge Libraries** | Wiki interna. Útil pero Basecamp/Drive ya cumple parcialmente. |
| **Goals / OKRs** | Vacío en ICONSA. Solo vale si hay cultura de OKRs. |
| **Performance** | Vacío. Solo vale si RRHH implementa ciclos de evaluación. |
| **Kudos** | Nice-to-have. Engagement y cultura. |

### ❌ SKIP (Bajo valor o ya cubierto)

| Módulo | Razón |
|--------|-------|
| **Feed / Red social** | ICONSA usa Basecamp. Duplicaría canal. |
| **Magazine** | Solo tiene contenido demo de Humand. Sin uso real. |
| **Chats** | WhatsApp ya cumple. No vale replicar. |
| **Marketplace** | Muy nicho. 1 post en toda la plataforma. |
| **Events** | Vacío. Basecamp cubre esto. |
| **Files** | Google Drive / Basecamp ya existe. |

### 🔑 HACER DIFERENTE en HumanOS

1. **No duplicar Feed/Chat** — ICONSA ya tiene Basecamp y WhatsApp. HumanOS debe ser operativo (solicitudes, ausencias, documentos), no social.

2. **Service Portal + Forms unificado** — Humand tiene 2 módulos separados que se solapan (Service Portal y Forms). HumanOS debería tener un solo sistema de solicitudes con workflows.

3. **Integración con MovimientOS** — People/Projects compartidos (la propuesta de schema `core` ya analizada). Time Off debería considerar impacto en disponibilidad de conductores/operarios.

4. **Mobile-first** — Los operarios de ICONSA están en campo. La app debe ser PWA o al menos responsive como Humand.

5. **Sin AI chatbot al inicio** — Sammy AI es cool pero no es prioridad. La data tiene que existir primero.

6. **Español nativo** — Humand tiene UI en inglés con contenido en español. HumanOS debe ser 100% español como MovimientOS.

---

## 6. Mapping ICONSA SOPs ↔ Humand Modules

| SOP ICONSA | Humand Module | Estado |
|-----------|---------------|--------|
| IC-LOG-PO-06 (Movilizaciones) | — | NO CUBIERTO (es MovimientOS) |
| Solicitud de Vacaciones | Time Off | ✅ Configurado |
| Solicitud de Anticipo | Forms (R-GGC-V01-22) | ✅ Configurado |
| Requisición de Personal | Forms | ✅ Configurado |
| Reporte de Incidente | Forms | ✅ Configurado |
| Afiliación de Empleado | Service Portal | ✅ Configurado |
| Carta de Renuncia | Service Portal | ✅ Configurado |
| Certificado de Empleo | Service Portal | ✅ Configurado |
| Canal de Denuncias | Service Portal + Surveys | ✅ Configurado (ambos) |
| Capacitaciones | Courses (LMS) | ✅ Configurado |
| Evaluaciones de Desempeño | Performance | ⚠️ No configurado |
| Inspección de Equipos (IC-EQ-F-01-02) | — | NO CUBIERTO (futuro MovimientOS) |
