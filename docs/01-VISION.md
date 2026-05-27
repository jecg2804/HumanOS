# 01-VISION.md — Misión, north star, decisiones grandes

**Última actualización**: 2026-05-27 (counts actualizados, decisiones finales sesión)

---

## Misión

Reemplazar la operación RRHH de ICONSA basada en formularios papel y app Humand ($4/user/mes) con un sistema integrado, propio, conectado al ecosistema digital ICONSA (MovimientOS, futuros apps Calidad/SSOA/Logística), respetando los SOPs existentes mientras agregamos best-practices de HRIS líderes (BambooHR, Workday, ServiceNow HR, Personio, Arcoro).

ICONSA es empresa de **construcción en Panamá** con personal mixto: oficina, supervisores, técnicos, y operarios de campo. La realidad operacional incluye personal con/sin email y supervisores acostumbrados al papel.

---

## North star metric (NSM)

**Tickets RRHH procesados digitalmente / total tickets RRHH (papel + digital) cada mes**.

Target post-overnight #1: 30% en early adopters (equipo HR + supervisores oficina).
Target medio plazo: 70%.
Target consolidación: 90%+.

Métricas soporte: tiempo promedio de resolución per tipo (SLA compliance), satisfacción empleados (NPS interno), adoption rate por departamento/proyecto.

---

## Decisiones grandes (no reabrir)

1. **Stack**: Next.js 16 + TypeScript 5+ + Tailwind 4 + Supabase + Vercel
2. **Mobile-first responsive** (no PWA service worker en MVP)
3. **Schemas HumanOS modulares en BD compartida**, NO BD separada (cost + integration con MovimientOS)
4. **Auth via Supabase**: invite codes generados por hr_admin + auth multi-app via `raw_app_meta_data.allowed_apps`
5. **MVP completo = 39 features F1-F39** (no subset)
6. **Workflow paralelo total**: RRHH desde día 0 en TODOS los tipos no `parent_only`. President también en paralelo cuando aplica (per SOP)
7. **SOP-driven approval chains** (R26): no desviarse del SOP sin validar con Samantha
8. **Eliminado `'supervisor'` como app_role**: emerge contextualmente de `hr.employments.supervisor_id` y `tickets.selected_supervisor_id`
9. **$250 PRESTAMO no bloqueante**: cap operacional, todos los préstamos van al chain completo
10. **Manual entry F32**: hr_admin crea solicitud en nombre del empleado con foto del form papel (realidad campo)
11. **F39 admin viewer chains Nivel A**: read-only MVP. Edit JSON raw v1.1
12. **Framework Claude Code**: cherry-pick Superpowers + mattpocock grill-with-docs + custom ICONSA skills
13. **Triple stack docs**: Project Files (Chat) / repo docs (Code) / wiki cross-app futuro
14. **Lenguaje español neutro Panamá**: NUNCA voseo
15. **No firma legal MVP**: stamp_data jsonb con metadata. Documenso v1.1

---

## Anti-decisiones (qué NO hacemos)

- ❌ Workflow secuencial puro (RRHH atrás de supervisor) — siempre paralelo
- ❌ Threshold bloqueantes en montos préstamo — cap operacional, no escalation
- ❌ rol 'supervisor' como CHECK constraint value — contextual
- ❌ Editor visual de approval chains en MVP — read-only viewer F39 Nivel A
- ❌ Re-implementar MovimientOS desde cero — coexistencia, integración futura
- ❌ Forzar correo a todos los empleados — sign-up acepta email O phone
- ❌ Auto-aprobaciones — toda solicitud requiere acción humana (anti-self-approval R5)
- ❌ Tocar `public.*`, `payroll.*`, `humanos.*` legacy — schemas prohibidos R1
- ❌ Bloquear acción de usuario por falla de notificación — fire-and-forget R18
- ❌ Modificar `auth.users` sin filtro explícito de `allowed_apps` — R22 critical
- ❌ Asumir que "Gerencia General" en SOP = "Presidente" Rodrigo único — validar con Samantha si VP/otros gerentes incluyen
- ❌ Implementar features sin SOP papel sin validación previa con Samantha — R26

---

## Contexto empresarial ICONSA

- Construcción Panamá
- ~370 personas total registradas en `hr.people` (184 activos + 186 inactivos/históricos)
- 48 usuarios actualmente en MovimientOS (auth.users)
- Equipo RRHH: Samantha Kosmas (Gerente), Rocío Olmedo, Milagros Manyoma, Jerelyn Mendoza
- Gerencia: Rodrigo Eisenmann (Presidente), Octavio Javier Ferrer (Vicepresidente), 7 gerentes de área
- Apps existentes: MovimientOS (operación vehicular)
- App planificadas: HumanOS (RRHH — ESTE), futuros Calidad/SSOA/Logística
- ERP: Spectrum (datos canónicos hasta consolidación MDM)

---

## Stakeholders

- **Samantha Kosmas** — Gerente RRHH, owner de SOPs, validador final business logic, decision-maker funcional
- **James Cucalón** — IT/Developer, owner técnico, integración con MovimientOS, decisiones arquitectónicas
- **Rodrigo Eisenmann** — Presidente, approver final en chains que lo requieren
- **Octavio Javier Ferrer** — Vicepresidente, potencial parte de "Gerencia General" en chains (validar con Samantha)
- **Equipo HR** (Rocío, Milagros, Jerelyn) — power users operacionales
- **184 empleados activos** — usuarios finales

---

## Time horizons

| Horizonte | Entrega |
|---|---|
| Overnight #1 (actual) | MVP 39 features funcionando E2E |
| Iteración humano post-overnight | Refinamiento UI, copy específico Samantha, edge cases descubiertos en uso real |
| v1.1 | Documenso firma, Twilio WhatsApp/SMS, F39-B editor JSON, calendario vacaciones |
| Overnight #2 | Onboarding workflow completo (`workflows.*`), Time Off advanced, expediente legal completo |
| v2 | Performance reviews, learning module, F39-C visual editor chains |

(Sin estimar duraciones por preferencia James — la prioridad es entrega, no calendario.)
