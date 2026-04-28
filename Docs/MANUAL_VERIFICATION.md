# HumanOS — Manual Verification Checklist

Esta checklist es la verificación end-to-end de Module 1 (Sistema de Solicitudes) antes de poner la app en producción. Se ejecuta una vez después del deploy preview o contra `localhost:3001` con BD del branch `humanos-dev`. Tiempo estimado: 20-30 min.

**Si algún paso falla**, anota el problema, no continúes — fix antes de demoar.

---

## Pre-requisitos

- [ ] `.env.local` configurado con `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, opcional `NOTIFICATION_TEST_EMAIL=jecg2804@gmail.com`.
- [ ] Seed de auth users corrió: `npm run seed:auth-users`. Verifica en BD: `SELECT code, auth_id IS NOT NULL FROM humanos.people WHERE code IN ('KOSM01','OLM206','MAN943','MEN943','EIS772','CUC166')` → 6 rows con `auth_id != null`.
- [ ] Migrations aplicadas: 7 archivos en `supabase/migrations/` (helper functions, submit RPC, decide RPC, reseed chains, seed supervisors, replace RLS, storage bucket). Si trabajas localmente y quieres re-aplicar, usa Supabase MCP `apply_migration`.
- [ ] `npm install` corrió, sin errores.
- [ ] `npm run dev` levanta en `http://localhost:3001` (o usa la URL del deploy preview).

Credenciales testers (password = `TestPass2026!`):
- Samantha Kosmas (HR Gerente, hr_admin) — email del seed
- Rocío Olmedo (HR Oficial, hr_admin)
- Milagros Manyoma (Planillas, hr_admin)
- Jerelyn Mendoza (Asistente RH, hr_admin)
- Rodrigo Eisenmann (Presidencia, employee + supervisor)
- Jaime Cucalón (CUC166, employee bajo Rodrigo)

---

## Sección 1 — Auth + roles (3 pasos)

- [ ] **1.1** Visitar `/inicio` sin sesión → redirect a `/login?next=/inicio`.
- [ ] **1.2** Login con Samantha (KOSM01) → redirect a `/inicio`. Header navy + ICONSA gold + "Hola, Samantha". Sidebar muestra "Admin" (porque es hr_admin). Bottom-tabs en mobile.
- [ ] **1.3** Logout (botón LogOut del UserMenu) → redirect a `/login`. Login con Jaime (CUC166) → ve `/inicio` PERO sidebar/tabs **NO** muestran "Admin". Visitar manualmente `/admin` por URL → redirect server-side a `/inicio`.

## Sección 2 — Knowledge base `/ayuda` (2 pasos)

- [ ] **2.1** `/ayuda` muestra los 12 tipos agrupados por categoría. Los 5 P1 con badge verde "Disponible" y botón "Iniciar solicitud" activo. Los 7 P2 con badge gris "Próximamente" y CTA italicada.
- [ ] **2.2** Cada P1 muestra "Quién aprueba" con nombres legibles (ej. VACACIONES → "Tu jefe → Rocío (RRHH) → Samantha"). Click en "Ver SOP" abre el PDF en nueva pestaña (verifica al menos VACACIONES → IC-RH-F-05-03).
- [ ] **2.3** Callout amarillo de "Sobre Horas Extras" visible al inicio.

## Sección 3 — Submit + flujo VACACIONES (4 pasos)

Como Jaime (CUC166), supervisor = Rodrigo (EIS772):

- [ ] **3.1** `/solicitudes/nueva` → grid muestra los 12 tipos. Click VACACIONES → `/solicitudes/nueva/vacaciones`.
- [ ] **3.2** Header muestra datos del solicitante (Jaime + código). Llenar form: pago=Completas, tiempo=Completas, 1 rango (mañana → mañana+5 días). Submit. Redirect automático a `/solicitudes/[id]` con request_number `HUM-2026-NNNN`.
- [ ] **3.3** Verifica en inbox (de `NOTIFICATION_TEST_EMAIL` si lo seteaste, sino del email real de Rodrigo): llegó email "Nueva solicitud por aprobar: HUM-2026-NNNN" con botón "Ver y aprobar". Click → abre `/solicitudes/[id]`.
- [ ] **3.4** Logout. Login Rodrigo (EIS772). Ve `/solicitudes/[id]`. Botón "Aprobar" visible. Click → modal con comentario. Confirmar. Status pasa a "En Revisión". Email llega a Rocío.
- [ ] **3.5** Logout. Login Rocío (OLM206). Aprobar. Email llega a Samantha.
- [ ] **3.6** Logout. Login Samantha (KOSM01). Aprobar. Status final = "Aprobada". Email "Tu solicitud fue Aprobada" llega a Jaime.

## Sección 4 — Submit PRESTAMO con escalación >$250 (3 pasos)

- [ ] **4.1** Login Jaime. `/solicitudes/nueva/prestamo`. Llenar monto=$200, descuento=$50, motivo (mínimo 30 chars), check de aceptación. Submit. **NO** debe abrir modal. Redirect directo a detalle. Chain: 3 steps (Rodrigo → Milagros → Samantha).
- [ ] **4.2** Otra vez `/solicitudes/nueva/prestamo`. Monto=$400, todo lo demás OK. Submit → **modal aparece** con texto: "Este monto excede el límite estándar de $250 establecido en IC-RH-D-02. Tu solicitud requerirá aprobación adicional de Presidencia, lo cual puede tardar más. ¿Deseas continuar?". 2 botones: "Reducir a $250" y "Continuar con $400".
- [ ] **4.3** Click "Continuar con $400" → submit procede. Chain: 4 steps (Rodrigo → Milagros → Samantha → Rodrigo Presidencia). Verifica en `/solicitudes/[id]` que la timeline muestra 4 pasos.

## Sección 5 — ACTUALIZACION_DATOS apply (3 pasos)

- [ ] **5.1** Login Jaime. `/solicitudes/nueva/actualizacion_datos`. Form pre-poblado con datos actuales. Cambiar dirección + celular. Submit → si los campos cambiaron → procede; si no cambiaste nada → error "No hiciste cambios".
- [ ] **5.2** Login Rocío → aprobar. Login Samantha → aprobar. Status = Aprobada.
- [ ] **5.3** Como Samantha en `/solicitudes/[id]` (mismo request), botón verde "Aplicar al expediente" visible. Click → modal de confirmación → "Confirmar y aplicar". Verifica en BD: `SELECT address, phone FROM humanos.people WHERE id = '<jaime_id>'` muestra los nuevos valores. Status del request = "Completada".

## Sección 6 — RECLAMO_PAGO con upload (2 pasos)

- [ ] **6.1** Login Jaime. `/solicitudes/nueva/reclamo_pago`. Llenar período (ej. 2026-04-01 → 2026-04-15), tabla con valores en al menos 1 fila (empleado=40, supervisor=32 → diferencia auto = 8). Descripción mínimo 30 chars. Subir 1 archivo PDF/JPG (<10MB). Submit → archivo se sube a Storage `humanos-attachments/<uuid>/<filename>`, request creada, redirect a detalle.
- [ ] **6.2** En `/solicitudes/[id]`, sección "Adjuntos" muestra el archivo con link. Click abre el PDF/imagen.

## Sección 7 — Solicita Info / Falta supervisor callout (1 paso)

- [ ] **7.1** Identifica un empleado con `supervisor_id IS NULL` (ej. alguien de Cumplimiento o Seguridad). Si no tiene auth, créaselo manualmente o usa Samantha (que también tiene supervisor_id por el seed). Mejor: crea una solicitud manualmente vía SQL con un requester sin supervisor:
   ```sql
   SELECT humanos.submit_request('VACACIONES', (SELECT id FROM humanos.people WHERE code='<CODE_SIN_SUPERVISOR>'), '{}'::jsonb, '[]'::jsonb, ARRAY['supervisor_directo','hr_oficial','hr_gerente']);
   ```
   Como hr_admin (Samantha), navega a `/solicitudes/[id]` de esa solicitud. Verifica callout amarillo: "⚠️ Falta supervisor — RRHH debe asignar uno en el expediente o aprobar directamente." Visible para HR y para el solicitante.

## Sección 8 — RLS / aislamiento (2 pasos)

- [ ] **8.1** Login Jaime. Crea una solicitud (ej. VACACIONES). Anota su `id`. Logout.
- [ ] **8.2** Login con otro empleado normal que NO sea aprobador en esa solicitud (ej. otro empleado que no sea Rodrigo, Rocío, Samantha, ni HR). Navegar manualmente a `/solicitudes/<id_de_jaime>` por URL → debe responder `404` (notFound) sin leak de información.

## Sección 9 — Admin dashboard (2 pasos)

- [ ] **9.1** Login Samantha. Navegar a `/admin`. Ve los 4 KPIs/paneles con números reales:
  - "Pendientes mías" (count de approvals donde Samantha = approver y decision=Pendiente)
  - "Esta semana" (requests submitted desde lunes)
  - "Vencidas" (>5 días sin acción)
  - "Activas por tipo" (lista con barras)
- [ ] **9.2** Tabla "Todas las solicitudes" abajo. Probar filtros: por estado (Aprobada), por tipo (VACACIONES), búsqueda por nombre del solicitante ("Cuc"), rango fecha. Click en una fila → abre `/solicitudes/[id]`.

## Sección 10 — Module 1.5 (2 pasos)

- [ ] **10.1** `/directorio` muestra 52 empleados activos. Búsqueda por "Kosmas" → 1 resultado. Pills de departamento: click "Recursos Humanos" → filtra a 3.
- [ ] **10.2** `/perfil` muestra los datos del usuario autenticado en secciones (Identidad, Contacto, Laboral, Otros). Botón "Actualizar datos" → `/solicitudes/nueva/actualizacion_datos`.

---

## Checks técnicos finales

- [ ] `npm run lint` exit code 0 (warnings preexistentes de RHF watch están OK).
- [ ] `npx tsc --noEmit` exit code 0.
- [ ] `npm run build` pasa.
- [ ] (Si hay deploy) Vercel preview URL responde `200` en `/`, `/login`, `/inicio` (autenticado).

## Si algo no funciona

1. Revisa `Docs/CHANGELOG.md` para contexto de la sesión.
2. Si hay error 500 — abre devtools, revisa server console o Vercel runtime logs.
3. Si el email no llegó — verifica `RESEND_API_KEY` no esté comentado, `RESEND_FROM_EMAIL` apunte a dominio verificado, y `NOTIFICATION_TEST_EMAIL` esté apuntando a un buzón al que tienes acceso.
4. Si el RPC falla con permission denied — verifica que las policies RLS de la migration `20260428_006_replace_rls_policies.sql` estén aplicadas.

Reportar bugs en `Docs/CHANGELOG.md` bajo "BUGS CONOCIDOS" o crear issue en el repo.
