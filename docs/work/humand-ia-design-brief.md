# Humand → HumanOS — IA map + design brief

**Role:** insumo de investigación para el **design brainstorm** (fundación de diseño antes de Group 3). NO es decisión congelada — alimenta el spec. · **Read-when:** al diseñar UI/UX/navegación. · **Source:** análisis read-only multi-agente de 28 screenshots de Humand (el incumbente que HumanOS reemplaza), en `humand-screenshots/`, 2026-06-02.

**Lente:** ~370 trabajadores de construcción ICONSA, low-literacy/low-tech, **mobile-first**, español neutro Panamá SIN voseo, marca Navy `#1B3A5C` + Gold `#F0A500` (tokens en `globals.css`; AppShell F3 ya existe). Principio rector: **paridad de necesidades y coherencia, NO feature-checklist contra Humand.**

**MVP ≠ visión final (clave):** el MVP expone ~6 secciones (Inicio/Solicitudes/Directorio/Perfil/Ayuda/Admin). Las secciones de la VISIÓN (blog/anuncios, capacitaciones/LMS, performance, surveys, AI "Sammy") están marcadas DROP→v2 abajo: **la BD ya está provisionada para ellas** (`docs.articles`, `learning.courses`, `pgvector`), pero NO se exponen en la nav del MVP. La IA se diseña para crecer hacia la visión sin re-arquitectura.

> **Corrección de validación (BD viva, 2026-06-02):** el reporte original decía que agrupar los 24 tipos requería crear `requests.types.category` — **falso: `category` (text) e `icon` (text) YA existen** en `requests.types`. El catálogo F29 usa esas columnas; no hay cambio de schema, solo poblar valores (data/seed al construir F29).

---

## 1. IA / navegación recomendada (mobile-first)

**Landing:** Humand aterriza en un **feed social** → **DROP.** El obrero abre la app para 3 cosas: ver su solicitud, hacer un trámite, aprobar pendientes. **Home = "mis solicitudes + tareas + acciones rápidas".**

**Nav PRIMARIO móvil — bottom-tabs (≤5, regla de los 5 dedos):**
1. **Inicio** — reemplaza el feed. Botones grandes de acciones rápidas (Pedir vacaciones, Mi colilla, Carta de trabajo, Reportar incidente) + "Mis solicitudes en curso" con progress bar + banner ligero opcional de avisos HR (read-only).
2. **Solicitudes (F28)** — corazón de la app. Catálogo visual de los 24 `requests.types` (iconos) + tabs "Mis solicitudes" / "Por aprobar" (badge contador para supervisor/hr_admin).
3. **Directorio (F8)** — gente, búsqueda, foto, botón llamar.
4. **Mi perfil (F6/F34)** — expediente propio + Mis documentos (colilla, contrato, cartas) + ancla del menú secundario.
5. **(condicional) Admin (F31)** — 5ª tab SOLO hr_admin/president vía RLS; el empleado ve 4.

- **Notificaciones (F36):** campana + badge en el **header** (NotificationBell ya shipped). NO ocupa tab.

**Nav SECUNDARIO (detrás del avatar/perfil o "Más"):** Ayuda/KB (F9), Organigrama "mi cadena" (F34), Configuración (F33), inbox de Notificaciones (F36), Cerrar sesión. Solo hr_admin: Empleados (F4/F5), Tipos viewer (F39), Auditoría (F37), Manual entry (F32).

**DIFERIDO / fuera de nav MVP (anti-scope §8 o v2; BD lista para crecer):** Feed social, Groups, Magazine/News (CMS), Chats, Events, Kudos, Performance, Goals, Learning/LMS, Surveys, People Experience, Marketplace, selector de idioma, billing.

**Decisión arquitectónica del admin:** Humand separa admin en sub-dominio (`admin.humand.co`) con SSO propio + billing. **HumanOS NO copia eso:** `/admin` es ruta protegida por rol dentro de la misma PWA (login único F2), gated hr_admin/president, sin billing (HumanOS elimina el costo $4/user/mes de Humand). El dashboard F31 muestra métricas **operacionales** (tickets pendientes por tipo, SLA vencidos, cola de aprobaciones, manual-entry pendiente), idealmente segmentables **por proyecto/obra** (realidad multi-sitio).

---

## 2. Tabla adopt / adapt / drop (por cluster)

### A — Navegación, landing, admin
| Sección Humand | Mapeo HumanOS | Verdict | Nota |
|---|---|---|---|
| Feed (landing) | F31 / docs.articles (v2) | **DROP** | Landing útil = solicitudes+tareas, no posts. |
| Composer (foto/poll/livestream) | — | **DROP** | Publicar al muro fuera de scope. |
| Celebrations | hr.people (derivable) | **DROP** | v2; máx mini-widget read-only, sin gamification. |
| Groups | — | **DROP** | Redes sociales internas (§8). |
| Magazine/News | docs.articles (CMS) | **DROP→v2** | CMS/blog es v2. |
| Chats | — | **DROP** | ICONSA usa WhatsApp. |
| Knowledge libraries | F9 /ayuda | **ADAPT** | Buscador grande + categorías visuales; "Ayuda", sin carpetas anidadas. |
| Events | — | **DROP** | No MVP. |
| Service portal | F28/F29/F30 | **ADAPT** | Corazón; nav PRIMARIO, "Solicitudes", catálogo visual 24 tipos. |
| Kudos | — | **DROP** | Gamification (§8). |
| Forms and Tasks | F28 (subsume) | **ADAPT** | Unificar con Solicitudes; no dos puertas. |
| Time off (módulo) | F10 (tipo dentro de F28) | **ADAPT** | NO módulo; balance = computed prerrellenado. |
| Performance / Goals | performance.* | **DROP→v2** | v2. |
| People | F8 /directorio | **ADOPT** | Patrón sirve; nav secundario, lista foto+cargo+llamar. |
| Org chart | F34 | **ADAPT** | Móvil = "mi cadena", no canvas pan-zoom. |
| Files (drive) | "Mis documentos" | **ADAPT** | Solo docs personales, no file-share. |
| Learning | learning.* | **DROP→v2** | F18 en MVP es una SOLICITUD, no LMS. |
| Onboarding (x2)/Tasks | F1 wizard (shipped) + workflows.* | **ADAPT** | No duplicar items; tracking es v2. |
| Surveys (badge "16") | — | **DROP→v2** | Reusar el patrón de badge para "por aprobar". |
| My documents | F6/F34 + F22/F23 | **ADOPT** | Muy útil (colilla, contrato). |
| Marketplace | — | **DROP** | Anti-scope §8 literal. |
| Quick links | Acciones rápidas del home | **ADAPT** | Botones grandes en Inicio. |
| Topbar campana | F36 NotificationBell | **ADOPT** | Ya construido; header. |
| Topbar idioma | — | **DROP** | Multi-idioma §8; UI 100% español. |
| Admin sub-dominio/billing | F31 misma PWA | **ADAPT/DROP** | Ruta por rol, sin billing ni vanity metrics. |

### B — Service portal / forms (core)
| Sección Humand | Mapeo | Verdict | Nota |
|---|---|---|---|
| Service landing (My requests) | F28 | **ADAPT** | landing=mis solicitudes + FAB sticky "Nueva"; quitar hero. |
| Estado "Unassigned" + #SR9 | F28/F30 estados | **ADAPT** | Estado en español orientado a acción ("En revisión", "Te toca a ti") + progress bar. |
| Sidebar 14 categorías | F29 (chips) | **ADAPT** | Sidebar no cabe en móvil; 4-5 chips RRHH. |
| Tarjetas gradiente + desc truncada | F29 listado | **ADAPT** | Filas grandes + icono + descripción completa. |
| Servicios no-RRHH (IT/almuerzo) | — | **DROP** | Solo los 24 `requests.types`. |
| Form Afiliación | F29 FormEngine | **ADAPT** | 1-columna + footer sticky; **prerrellenar `source='profile'` read-only, pedir solo `user_input`**. |
| Códigos SOP crudos (R-GGC-V01-22) | metadata/F39 | **DROP** | Nunca mostrar al obrero. |
| Chatbot "Sammy" | AI assistant (v2) | **DROP→v2** | BD lista para RAG. |

### C — People / Org chart / Time off
| Sección Humand | Mapeo | Verdict | Nota |
|---|---|---|---|
| Tabla directorio | F8 v_directory | **ADAPT** | Tabla→lista de cards (avatar+nombre+cargo+obra). |
| Email + "Send message" hover | — | **DROP** | Obreros sin correo; no mostrar email. |
| Org chart canvas pan-zoom | F34 v_org_chart | **ADAPT** | Árbol vertical "mi jefe/yo/mi equipo". |
| Org chart tarjeta | F34 | **DROP campos** | NUNCA salario/cédula (R13). |
| Time off: cards de saldo | hr.leave_balances | **ADAPT** | Tipos Panamá; número computed read-only; CTA "Solicitar vacaciones". |
| Time off: Calendar | calendario ausencias | **ADAPT** | Solo supervisor/hr_admin. |

### D — Knowledge / contenido / documentos
| Sección Humand | Mapeo | Verdict | Nota |
|---|---|---|---|
| KB landing (buscador + bibliotecas) | F9 docs.article_categories/articles/sops | **ADOPT** | Categoría→artículos, lista vertical + buscador fijo. |
| KB full-text | F35 search | **ADOPT** | Clave para low-literacy. |
| Magazine (editorial) | docs.articles category='anuncio' | **ADAPT→v2** | Cards 1-col; quitar comentarios/likes (§8). |
| Autoría centralizada | docs.articles.created_by (editor) | **ADOPT** | Solo editor publica; obrero lee (user-authored controlado). |
| My documents | hr.personal_documents (R13 owner) | **ADAPT** | Lista plana (contrato/colillas/certificados/ID), sin folders. |
| Files (drive + árbol) | files.uploads/docs.sops | **DROP** | No replicar drive corporativo. |

### E — Performance / Goals / Learning (v2)
| Sección | Mapeo | Verdict | Nota |
|---|---|---|---|
| Performance ciclos | performance.* | **DROP→v2** | Si llega: escala de iconos, no rúbricas. |
| Goals/OKR | performance.* | **DROP→v2** | Si llega: checklist hecho/no. |
| Onboarding lifecycle (tablero) | workflows.* | **ADAPT→v2** | Reusa progress-bar de F28; vista admin/supervisor. |
| Courses/LMS | learning.* | **DROP→v2** | Mayor valor ICONSA (inducción SSO obligatoria): video+quiz, completitud al expediente. Reservar taxonomía construcción (Seguridad/EPP/Maquinaria/Inducción). |

### F — Engagement + Admin
| Sección | Mapeo | Verdict | Nota |
|---|---|---|---|
| Groups/Events/Kudos/Marketplace/Chats | — | **DROP** | §8 (social/gamification/marketplace). |
| Surveys | v2 (reuso FormEngine) | **ADAPT→v2** | Único engagement con valor legal: riesgo psicosocial (SST) + canal de denuncias (Ley 81); form_schema sin chain + flag anónimo. |
| Sammy AI chatbot | AI assistant pgvector RAG | **ADAPT→v2** | Español + voz para low-literacy; consentimiento Ley 81 (R27). |
| Admin login (subdominio/SSO) | F31 misma PWA (F2) | **ADAPT** | SSO/login sí, app separada no. |
| Admin dashboard (vanity metrics) | F31 | **ADAPT** | Métricas operacionales por tipo/SLA/obra; HuCoins DROP. |

---

## 3. Arquetipos de página (cubren las 39 features)

| Arquetipo | Features | Ref Humand |
|---|---|---|
| **Lista (cards, NUNCA tabla en móvil)** | F28 solicitudes, F8 directorio, time-off historial, mis documentos, anuncios | My requests, People, Magazine |
| **Detalle / ficha read-only** | F30 detalle ticket (timeline), ficha persona, artículo KB | SR detail, perfil |
| **Form / wizard (1-col, footer sticky, prefill profile/computed)** | F29 (24 tipos), F1 wizard, F4/F5 admin, solicitar vacaciones | Form Afiliación |
| **Dashboard (tiles + date-range + filtros)** | F31 /admin (pendientes/SLA/por obra), F37 auditoría | Admin Insights |
| **Catálogo filtrable (buscador + chips + iconos)** | F29 catálogo, F9 KB, F35 search | Service catalog, KB |
| **Contenido / artículo (lectura full-screen, tipografía grande)** | F9 KB, anuncios HR | Magazine/KB article |

**Transversal:** cero tablas de N columnas en móvil → cards. El componente **estado+progress-bar** es único y reutilizable (tickets F28 hoy, onboarding-tracking v2 mañana).

---

## 4. Brief para el design brainstorm

**ADOPTAR (patrones probados que los usuarios ya conocen):**
1. Campana+badge (F36, shipped) y avatar→menú; el badge se reusa para "por aprobar".
2. Directorio con avatar/iniciales-Navy + cross-link directorio↔organigrama; catálogo filtrable con buscador full-text; autoría centralizada de anuncios.
3. Card de saldo por tipo (time-off) y el modelo estado+progress-bar (tickets hoy, onboarding v2).

**SIMPLIFICAR (móvil / low-tech / español):**
4. **Formularios casi-llenos** (la diferencia clave vs Humand): `profile` prerrellenado read-only NUNCA pedido, `computed` read-only con badge "Calculado", solo `user_input` editable. 1-columna + footer sticky + `*` requeridos.
5. Tablas→cards; canvas→árbol "mi cadena"; sidebar de 14 categorías→4-5 chips RRHH (Documentos, Tiempo/Permisos, Dinero, Seguridad/Obra, Mis datos). Targets ≥44px, iconos CON etiqueta.
6. Estados/labels en español orientado a acción ("En revisión", "Te toca a ti"); nunca jerga ("Unassigned") ni códigos SOP crudos de cara al obrero.

**EVITAR (§8 / sprawl):**
7. DROP duro: feed-as-landing, Groups, Chats, Kudos/leaderboard, Marketplace, idioma, billing, admin-subdominio, drive compartido, hero/banners que empujan contenido fuera de pantalla, códigos de control documental visibles.
8. DIFERIR a v2 con BD lista (no exponer en nav MVP): CMS/blog (docs.articles), LMS (learning.courses), Performance/Goals, Surveys (valor legal SST/Ley 81), onboarding-tracking (workflows.*), AI "Sammy" (pgvector RAG, voz, consentimiento R27).

**Principios rectores:** mobile-first real (≤5 destinos primarios, 1 columna, FAB/CTA sticky) · low-tech (iconos+etiqueta, sin truncar, voz donde aplique) · español llano Panamá sin voseo · Navy/Gold vía tokens (sin hex hardcode) · paridad de NECESIDADES no feature-checklist · **R13/Ley 81 en las VISTAS** (v_directory/v_org_chart nunca exponen salario/cédula/médico — defense-in-depth con RLS, no solo ocultar en UI; la IA hereda la RLS del usuario).

---

## Próximo paso
Este brief → **design brainstorm** (atendido, con Jaime; skills `brainstorming` + `frontend-design`, sobre tokens Navy/Gold + AppShell F3) → **design spec** (design system + IA-para-la-visión + arquetipos + flujos MVP) → ADR "fundación de diseño antes de feature-UI" + workstream en STATUS. La fundación de diseño aterriza **antes de Group 3** (primera superficie grande de UI).
