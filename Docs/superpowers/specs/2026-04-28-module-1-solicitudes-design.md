# Module 1 — Sistema de Solicitudes — Design Spec

**Autor:** Claude Code (sesión 2026-04-28)
**Estado:** Approved-pending-review (votos de James capturados en Decision Log §16)
**Predecesor:** `Docs/feature-specs/MODULE-1-SOLICITUDES.md` (guía de producto)
**Sucesor:** `Docs/superpowers/plans/2026-04-28-module-1-solicitudes-plan.md` (a generar con writing-plans)

---

## 1. Contexto y objetivos

HumanOS es la plataforma interna de RRHH de ICONSA. Module 1 es el corazón del MVP: 5 formularios productivos + motor de aprobación + knowledge base + dashboard de HR + emails. Después de esta sesión Samantha (Gerente RRHH) debe poder usar la app para procesar solicitudes reales.

**Definición de éxito:**
- Empleado autenticado entra a `/ayuda`, entiende qué formulario llenar, lo llena, lo envía.
- El primer aprobador recibe email Resend con link al detalle.
- Aprobador entra, decide. Si rechaza → fin + email al solicitante. Si aprueba y queda otro paso → email al siguiente aprobador. Si era el último → email final al solicitante.
- Samantha en `/admin` ve KPIs reales (pendientes mías, esta semana, vencidas) y la tabla filtrable.
- Para `ACTUALIZACION_DATOS`: cuando Samantha aprueba el último paso, puede aplicar los cambios al `humanos.people` con un click.

## 2. Scope

### 2.1 In scope (Module 1)
- 5 formularios P1 funcionales: VACACIONES, ACCION_PERSONAL, PRESTAMO, ACTUALIZACION_DATOS, RECLAMO_PAGO.
- Motor genérico de aprobación: estados, transiciones, role resolution, función RPC atómica.
- `/ayuda` — knowledge base con los 12 tipos.
- `/solicitudes/nueva` — grid con los 12 tipos (P1 navegables, P2 deshabilitados con badge "próximamente").
- `/solicitudes` — lista de "Mis solicitudes" + filtros.
- `/solicitudes/[id]` — detalle + timeline + acciones contextuales.
- `/admin` — dashboard HR con KPIs y tabla filtrable.
- 3 emails Resend: enviada → primer aprobador, parcial → siguiente aprobador, final → solicitante.

### 2.2 In scope (Module 1.5 — bonus barato al final del plan)
- `/directorio` — lista de empleados activos con búsqueda básica.
- `/perfil` — read-only del propio empleado.

Estas dos páginas son SELECT directos, ~30 min cada una. Cierran el checklist demoable a Samantha sin desviar el plan.

### 2.3 Fase 0 (prerequisito embebido en el plan, no en este spec funcional)
- Scaffold Next.js 16 + TypeScript strict + Tailwind 4 + tokens ICONSA.
- 3 Supabase clients: server-cookies, browser, admin (service-role).
- Auth: middleware de sesión, login/logout, role determination via `getMe()`.
- Layout shell `(app)`: sidebar desktop / bottom-tabs mobile.
- shadcn/ui base components (Button, Input, Label, Select, Textarea, Card, Dialog, Badge, Toast).
- Resend client + base email template (header navy + ICONSA gold).
- Storage bucket `humanos-attachments`.
- Seed script `scripts/seed-auth-users.ts` para crear auth accounts de los 6 testers.
- Pipeline Vercel preview.

### 2.4 Out of scope
- 7 P2 forms con UI funcional (solo aparecen en `/ayuda` y deshabilitados en grid).
- `/admin/empleados` y `/admin/empleados/[id]` (expediente completo) → Module 2.
- WhatsApp/Twilio.
- PWA/offline.
- Cálculos de Payday (días disponibles, ISR, montos correctos de pago).
- Generación de PDFs.
- HR creando tipos de solicitud nuevos desde la UI (form schema sigue hardcoded en TS).

## 3. Arquitectura

```
Next.js 16 App Router (deploy: Vercel)
├── (public)/login                       # email + password
├── (app)/                               # auth-required layout shell
│   ├── inicio                           # saludo + cards
│   ├── ayuda                            # knowledge base
│   ├── solicitudes/
│   │   ├── page.tsx                     # mis solicitudes
│   │   ├── nueva/page.tsx               # grid 12 tipos
│   │   ├── nueva/[code]/page.tsx        # form dinámico
│   │   └── [id]/page.tsx                # detalle + timeline
│   ├── admin/page.tsx                   # dashboard HR (gated por role)
│   ├── directorio/page.tsx              # Module 1.5
│   └── perfil/page.tsx                  # Module 1.5

src/
├── lib/
│   ├── supabase/
│   │   ├── server.ts                    # createServerClient (cookies)
│   │   ├── browser.ts                   # createBrowserClient
│   │   └── admin.ts                     # createAdminClient (service_role)
│   ├── auth/
│   │   └── getMe.ts                     # cached server-side me lookup + role
│   ├── forms/
│   │   ├── schemas/
│   │   │   ├── vacaciones.ts            # zod
│   │   │   ├── accion-personal.ts
│   │   │   ├── prestamo.ts
│   │   │   ├── actualizacion-datos.ts
│   │   │   └── reclamo-pago.ts
│   │   └── registry.ts                  # code → { schema, component, helpInfo }
│   ├── approvals/
│   │   ├── roles.ts                     # role codes + label map
│   │   ├── submit.ts                    # server action
│   │   └── decide.ts                    # server action
│   ├── email/
│   │   ├── client.ts                    # Resend client
│   │   ├── templates/
│   │   │   ├── solicitud-enviada.ts
│   │   │   ├── solicitud-decidida.ts
│   │   │   └── decision-final.ts
│   │   └── send.ts                      # sendNotification(...) con test-mode
│   └── utils/
│       └── cn.ts                        # tailwind-merge
├── components/
│   ├── shell/                           # AppShell, Sidebar, BottomTabs
│   ├── ui/                              # shadcn (Button, Input, etc.)
│   ├── forms/
│   │   ├── VacacionesForm.tsx
│   │   ├── AccionPersonalForm.tsx
│   │   ├── PrestamoForm.tsx
│   │   ├── ActualizacionDatosForm.tsx
│   │   └── ReclamoPagoForm.tsx
│   ├── solicitudes/
│   │   ├── RequestList.tsx
│   │   ├── RequestStatusBadge.tsx
│   │   ├── RequestTimeline.tsx
│   │   └── RequestDetailRenderer.tsx    # render form_data por tipo
│   └── admin/
│       ├── AdminKPICards.tsx
│       └── AdminRequestsTable.tsx
└── types/
    ├── people.ts
    ├── requests.ts
    └── forms.ts                         # types derivados de los zod schemas
```

**Principios:**
- TypeScript strict. No `any`. Tipos derivados de zod schemas con `z.infer`.
- Server Components por default. `'use client'` solo en componentes con interactividad (forms, dropdowns, modals).
- Forms: React Hook Form + zodResolver. Misma schema valida cliente y server.
- Server Actions invocan funciones Postgres atómicas; emails se mandan post-commit.
- RLS al nivel de BD + chequeos defensivos en server actions.

## 4. Modelo de datos — cambios al schema

Schema base ya existe (`humanos.*` con 5 tablas). Cambios necesarios:

### 4.1 `request_types.approval_chain` — re-seed con roles semánticos

Roles válidos:
| Código | Resuelve a | Notas |
|---|---|---|
| `supervisor_directo` | `requester.supervisor_id` | Si null → step se omite |
| `hr_oficial` | `people.code='OLM206'` (Rocío Olmedo) | |
| `hr_planilla` | `people.code='MAN943'` (Milagros Manyoma) | |
| `hr_gerente` | `people.code='KOSM01'` (Samantha Kosmas) | |
| `presidencia` | `people.code='EIS772'` (Rodrigo Eisenmann) | |

Chains seed:
| Code | approval_chain | requires_approval |
|---|---|---|
| `VACACIONES` | `{supervisor_directo, hr_oficial, hr_gerente}` | true |
| `ACCION_PERSONAL` | `{supervisor_directo, hr_gerente, presidencia}` | true |
| `PRESTAMO` | `{supervisor_directo, hr_planilla, hr_gerente}` | true |
| `ACTUALIZACION_DATOS` | `{hr_oficial, hr_gerente}` | true (cambia de `false`) |
| `RECLAMO_PAGO` | `{hr_planilla, hr_gerente}` | true |

(P2 chains se mantienen como están; no son funcionales en el MVP.)

### 4.2 Nuevas funciones Postgres

```sql
-- Resuelve un role semántico + requester a un person uuid (o NULL si no aplica).
CREATE FUNCTION humanos.resolve_approver(p_role text, p_requester_id uuid)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_role = 'supervisor_directo' THEN
    SELECT supervisor_id INTO v_id FROM humanos.people WHERE id = p_requester_id;
    RETURN v_id;
  ELSIF p_role = 'hr_oficial' THEN
    SELECT id INTO v_id FROM humanos.people WHERE code = 'OLM206';
  ELSIF p_role = 'hr_planilla' THEN
    SELECT id INTO v_id FROM humanos.people WHERE code = 'MAN943';
  ELSIF p_role = 'hr_gerente' THEN
    SELECT id INTO v_id FROM humanos.people WHERE code = 'KOSM01';
  ELSIF p_role = 'presidencia' THEN
    SELECT id INTO v_id FROM humanos.people WHERE code = 'EIS772';
  ELSE
    RAISE EXCEPTION 'unknown role: %', p_role;
  END IF;
  RETURN v_id;
END;
$$;

-- Genera el siguiente request_number formato HUM-YYYY-NNNN, atómico.
CREATE FUNCTION humanos.next_request_number()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  v_n bigint;
BEGIN
  UPDATE humanos.sequences SET current_value = current_value + 1
  WHERE name = 'request_number'
  RETURNING current_value INTO v_n;
  RETURN format('HUM-%s-%s', extract(year from now())::int, lpad(v_n::text, 4, '0'));
END;
$$;

-- Submit atómico: crea request + N approvals (skipping NULL approvers).
-- Retorna {request_id, request_number, first_approver_id}.
CREATE FUNCTION humanos.submit_request(
  p_type_code text,
  p_requester_id uuid,
  p_form_data jsonb,
  p_attachments jsonb,
  p_approval_chain text[]   -- chain resuelto por el caller (puede diferir del default p.ej. PRESTAMO>$250)
) RETURNS TABLE(request_id uuid, request_number text, first_approver_id uuid)
LANGUAGE plpgsql AS $$
DECLARE
  v_type_id uuid;
  v_request_id uuid;
  v_number text;
  v_role text;
  v_approver uuid;
  v_step int := 1;
  v_first uuid := NULL;
BEGIN
  SELECT id INTO v_type_id FROM humanos.request_types WHERE code = p_type_code AND is_active = true;
  IF v_type_id IS NULL THEN RAISE EXCEPTION 'unknown or inactive type: %', p_type_code; END IF;

  v_number := humanos.next_request_number();

  INSERT INTO humanos.requests (request_number, type_id, requester_id, status, form_data, attachments, date_submitted)
  VALUES (v_number, v_type_id, p_requester_id, 'Enviada', p_form_data, p_attachments, now())
  RETURNING id INTO v_request_id;

  FOREACH v_role IN ARRAY p_approval_chain LOOP
    v_approver := humanos.resolve_approver(v_role, p_requester_id);
    IF v_approver IS NOT NULL THEN
      INSERT INTO humanos.request_approvals (request_id, approver_id, step_order, role_required, decision)
      VALUES (v_request_id, v_approver, v_step, v_role, 'Pendiente');
      IF v_first IS NULL THEN v_first := v_approver; END IF;
      v_step := v_step + 1;
    END IF;
  END LOOP;

  -- Si chain queda vacío (todos se omitieron) → auto-aprobada
  IF v_first IS NULL THEN
    UPDATE humanos.requests SET status = 'Aprobada', date_resolved = now() WHERE id = v_request_id;
  END IF;

  RETURN QUERY SELECT v_request_id, v_number, v_first;
END;
$$;

-- Decisión atómica de un step: actualiza approval, deduce siguiente paso o cierra.
-- Retorna {request_status, next_approver_id, is_final}.
CREATE FUNCTION humanos.decide_approval(
  p_approval_id uuid,
  p_decider_id uuid,    -- el caller (validar = approver_id)
  p_decision text,      -- 'Aprobada' | 'Rechazada' | 'Solicita Info'
  p_comments text
) RETURNS TABLE(request_status text, next_approver_id uuid, is_final boolean)
LANGUAGE plpgsql AS $$
DECLARE
  v_approval humanos.request_approvals%ROWTYPE;
  v_request_id uuid;
  v_next humanos.request_approvals%ROWTYPE;
  v_status text;
BEGIN
  SELECT * INTO v_approval FROM humanos.request_approvals WHERE id = p_approval_id FOR UPDATE;
  IF v_approval.id IS NULL THEN RAISE EXCEPTION 'approval not found'; END IF;
  IF v_approval.approver_id != p_decider_id THEN RAISE EXCEPTION 'not your approval'; END IF;
  IF v_approval.decision != 'Pendiente' THEN RAISE EXCEPTION 'already decided'; END IF;
  IF p_decision NOT IN ('Aprobada','Rechazada','Solicita Info') THEN RAISE EXCEPTION 'bad decision'; END IF;

  v_request_id := v_approval.request_id;

  UPDATE humanos.request_approvals
     SET decision = p_decision, comments = p_comments, decided_at = now()
   WHERE id = p_approval_id;

  IF p_decision = 'Rechazada' THEN
    UPDATE humanos.requests SET status='Rechazada', date_resolved=now() WHERE id=v_request_id;
    RETURN QUERY SELECT 'Rechazada'::text, NULL::uuid, true;
    RETURN;
  END IF;

  -- 'Solicita Info': por ahora se trata igual que aprobada parcial, pero conservamos comments
  -- (UI v1 NO expone "Solicita Info" como acción separada — solo aprobar/rechazar).

  SELECT * INTO v_next
    FROM humanos.request_approvals
   WHERE request_id = v_request_id AND decision = 'Pendiente'
   ORDER BY step_order ASC LIMIT 1;

  IF v_next.id IS NULL THEN
    UPDATE humanos.requests SET status='Aprobada', date_resolved=now() WHERE id=v_request_id;
    RETURN QUERY SELECT 'Aprobada'::text, NULL::uuid, true;
  ELSE
    UPDATE humanos.requests SET status='En Revisión' WHERE id=v_request_id AND status='Enviada';
    RETURN QUERY SELECT 'En Revisión'::text, v_next.approver_id, false;
  END IF;
END;
$$;
```

### 4.3 RLS — reemplazar policies permisivas

**`humanos.people`:**
- SELECT: cualquier authenticated puede ver `id, name, code, email, phone, department, position, office, photo_url, status` de personas con `status='Activo'`. Otros campos: solo HR.
- UPDATE: solo HR (o el dueño en columnas específicas — diferido a Module 2).

**`humanos.request_types`:** SELECT all authenticated.

**`humanos.requests`:**
- SELECT: requester_id = me.id OR me es approver del request OR me es hr_admin.
- INSERT: server actions usan service-role; bloqueado directo.
- UPDATE: server actions / RPC; bloqueado directo.

**`humanos.request_approvals`:**
- SELECT: misma regla de visibilidad que requests (a través de join).
- UPDATE: bloqueado directo (solo via RPC `decide_approval`).

**`humanos.sequences`:** ningún acceso directo; solo via funciones SECURITY DEFINER.

Helpers SQL:
```sql
CREATE FUNCTION humanos.me() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT id FROM humanos.people WHERE auth_id = auth.uid()
$$;

CREATE FUNCTION humanos.is_hr() RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM humanos.people
    WHERE auth_id = auth.uid()
    AND code IN ('KOSM01','OLM206','MAN943','MEN943')
  )
$$;
```

### 4.4 Storage bucket
```sql
-- vía supabase storage:
-- Bucket: humanos-attachments, public=false.
-- Policy: authenticated INSERT to {request_id}/* if me es requester or hr.
-- Policy: authenticated SELECT from {request_id}/* if puede ver el request.
```

## 5. Motor de aprobación — flujo completo

```
EMPLEADO submits → submitRequestAction(formData)
   ↓
   1. server action valida con zod (re-valida lo del cliente)
   2. resuelve approval_chain efectivo (PRESTAMO: si monto>250 → append 'presidencia')
   3. .rpc('submit_request', {...}) atómico
   4. si first_approver_id != null → sendNotification('solicitud-enviada', { request_id, approver_id })
   5. redirect → /solicitudes/[id]

APROBADOR decide → decideApprovalAction(approval_id, decision, comments)
   ↓
   1. server action verifica que me es el approver
   2. .rpc('decide_approval', {...}) atómico
   3. if decision='Rechazada':
        sendNotification('decision-final', { to: requester, decision: 'Rechazada' })
      elif is_final=true:
        sendNotification('decision-final', { to: requester, decision: 'Aprobada' })
      else:
        sendNotification('solicitud-decidida', { to: next_approver, request_id })
   4. revalidate /solicitudes y /admin

HR aplica ACTUALIZACION_DATOS → applyDataUpdateAction(request_id)
   ↓
   1. server action verifica: hr_admin Y status='Aprobada' Y type='ACTUALIZACION_DATOS'
   2. lee form_data, hace UPDATE humanos.people SET ... WHERE id=requester_id
   3. UPDATE requests SET status='Completada' WHERE id=request_id
   4. revalidate
```

**Estado machine:**
```
Borrador  → (cancel) → Cancelada
          ↓ submit
Enviada   → (1er approve) → En Revisión
          ↓ approve (todo)        ↓ approve (último)
          → Aprobada               → Aprobada
                                   ↓ HR apply (solo ACT. DATOS)
                                   → Completada
   any step rechaza               → Rechazada
```

(MVP: `Borrador` opcional — se puede saltar `Borrador` y enviar directo. UI v1 solo expone "Enviar" sin "Guardar borrador".)

## 6. Formularios — diseño per tipo

**Patrón común:**
- Header con título + breadcrumb "Solicitudes / Nueva / [Tipo]".
- Sección "Datos del solicitante" (auto-fill, read-only): nombre, code, cédula, departamento, cargo. Auto from `getMe()`.
- Sección "Datos de la solicitud" (los campos específicos del tipo).
- Si type permite adjuntos: dropzone Supabase Storage.
- Footer con botón "Enviar" + "Cancelar". Mobile: sticky bottom.
- Submit muestra loading state, en éxito redirige a `/solicitudes/[id]` con toast "Solicitud HUM-2026-0001 enviada".

### 6.1 VACACIONES (`/solicitudes/nueva/vacaciones`)
**Campos según PDF F-05-03:**
- `pago_vacaciones`: radio — `Completas` | `Adelanto sobre acumulado` | `Descuento de días solicitados`. Required.
- `tiempo_solicitado`: radio — `Completas` | `Parciales`. Required.
- `desglose`: array de 1-3 rangos `{desde: date, hasta: date}`. Si `tiempo_solicitado='Completas'` → exactamente 1 rango. Si `Parciales` → 1 a 3 rangos.
- `observaciones`: textarea optional.

**Validaciones:**
- Cada rango: `desde >= hoy` Y `hasta >= desde`.
- Rangos no se traslapan entre sí.
- Rangos no traslapan con otra solicitud `VACACIONES` Aprobada/En Revisión del mismo empleado (query a `humanos.requests` con `form_data->>'desglose'`).

**Aprobación:** `[supervisor_directo, hr_oficial, hr_gerente]`.

### 6.2 ACCION_PERSONAL (`/solicitudes/nueva/accion-personal`)
**Campos según PDF F-05-01:**
- `sub_tipo`: select — `Aumento de Salario` | `Autorización de Horas Extras` | `Permisos` | `Descuento` | `Despido` | `Orden de Liquidación`. Required.
- `empleado_objeto`: si yo soy supervisor/HR, puedo iniciar para otro. Default = me. UI v1 SOLO permite "para mí mismo o para uno de mis subordinados directos" (employees pueden iniciar solo para sí mismos).
- `observaciones`: textarea required.
- Adjuntos: 0..3.

**Nota documental (per James):** El sub-tipo `Autorización de Horas Extras` aquí es POST-FACTO (autorizar que entren a planilla). Distinto al P2 standalone HORAS_EXTRAS pre-facto (autorización para trabajar overtime). En MVP solo existe el primero. Se documenta en `/ayuda` para evitar confusión.

**Aprobación:** `[supervisor_directo, hr_gerente, presidencia]`.

### 6.3 PRESTAMO (`/solicitudes/nueva/prestamo`)
**Campos según PDF F-05-02:**
- `monto_solicitado`: number ≥ 1, redondeado a 2 decimales. Required.
- `descuento_propuesto`: number ≥ 1, "monto a descontar por bisemana". Required.
- `motivo`: textarea required, min 30 chars (la regla del IC-RH-D-02 es explícita: "no ser muy específico demora la aprobación").
- `acepta_descuento_liquidacion`: checkbox required ("Acepto que en caso de liquidación, el saldo pendiente se descuente de mi liquidación").

**Validaciones cliente + server:**
- Si `monto_solicitado > 250` → mostrar warning amarillo: *"Este monto excede el límite normal de $250. Tu solicitud requerirá aprobación adicional de Presidencia, lo cual puede tardar más."* No bloquea submit.
- `descuento_propuesto > 0` Y `descuento_propuesto <= monto_solicitado`.

**Aprobación dinámica:**
- `monto_solicitado <= 250` → `[supervisor_directo, hr_planilla, hr_gerente]`.
- `monto_solicitado > 250` → `[supervisor_directo, hr_planilla, hr_gerente, presidencia]`.

### 6.4 ACTUALIZACION_DATOS (`/solicitudes/nueva/actualizacion-datos`)
**Campos según PDF F-00-07:** (estrictamente lo que pide el PDF; demás campos viven en `/perfil`)
- `direccion`: object — `{ calle_barriada: string, apartamento_casa_no: string }`.
- `telefono_casa`: string optional.
- `celular_personal`: string required (mobile-first → todos tienen).
- `estado_civil`: radio — `Soltero(a)` | `Casado(a)` | `Unido(a)`.
- `pareja`: object optional, requerido si estado_civil ∈ {Casado, Unido} — `{ nombre: string, telefono: string }`.
- `dependientes`: array de `{ nombre: string, parentesco: string }`. 0..N.

**UX especial:** form pre-poblado con valores actuales de `humanos.people` del solicitante. Al enviar, server action calcula el "diff" y guarda en `form_data` SOLO los campos cambiados (más metadata `{ campos_cambiados: ['direccion', 'estado_civil'] }`).

**Aplicación al expediente** (HR-only, post-aprobada):
- Botón "Aplicar al expediente" en el detalle (visible solo para HR si status='Aprobada' Y type='ACTUALIZACION_DATOS').
- Server action: hace `UPDATE humanos.people SET ... WHERE id = requester_id` + `UPDATE requests SET status='Completada'`.
- Mapeo `form_data` → `humanos.people` columnas (lo que SE aplica al expediente):
  - `direccion.calle_barriada` + `direccion.apartamento_casa_no` → concat con coma → `address`.
  - `celular_personal` → `phone`. (`humanos.people.phone` es el teléfono primario.)
  - `estado_civil` → `marital_status`.
  - `pareja` y `dependientes` → JSONB en `humanos.people.notification_preferences` (campo ya existente JSONB) bajo keys `pareja` y `dependientes`. Refactor a columnas formales en Module 2 si surge necesidad.
- Lo que NO se aplica pero SÍ se preserva en `requests.form_data` para auditoría:
  - `telefono_casa` — no hay columna en `people`. El form lo recolecta porque el PDF lo pide; el apply lo ignora. Si en el futuro se agrega `home_phone`, los requests pasados son backfilleable.
- (Esto evita una migración de schema en `people` ahora. Module 2 puede formalizar pareja/dependientes/home_phone si necesario.)

**Aprobación:** `[hr_oficial, hr_gerente]`.

### 6.5 RECLAMO_PAGO (`/solicitudes/nueva/reclamo-pago`)
**Campos según PDF F-05-05:** tabla 5 filas × 3 columnas.
- `periodo`: object — `{ desde: date, hasta: date }`. Required (el periodo en disputa).
- `tabla`: array de 5 filas fijas:
  ```
  [
    { categoria: 'Hrs. Reg. Pagadas',  empleado: number?, supervisor: number?, diferencia: number? },
    { categoria: 'Horas de ST. Pagadas', empleado: number?, supervisor: number?, diferencia: number? },
    { categoria: 'Certificados Médicos', empleado: number?, supervisor: number?, diferencia: number? },
    { categoria: 'Ausencias', empleado: number?, supervisor: number?, diferencia: number? },
    { categoria: 'Feriados', empleado: number?, supervisor: number?, diferencia: number? }
  ]
  ```
  El empleado llena `empleado` (lo que él reporta) y opcionalmente `supervisor` (lo que el supervisor reportó según su comprobante). `diferencia` se calcula automático = empleado - supervisor.
- `descripcion`: textarea required, min 30 chars.
- `adjuntos`: 0..3 (foto del comprobante).

**Validaciones:**
- Al menos 1 fila con `empleado != null`.

**Aprobación:** `[hr_planilla, hr_gerente]`.

## 7. Knowledge base `/ayuda`

Server component que lee `humanos.request_types` y agrupa por `category`. Renderiza:
- Header explicativo: "Aquí encuentras todos los formularios que RRHH maneja, qué necesitas para llenarlos, y quién los aprueba."
- Sección por categoría (ej. "Permisos y Vacaciones", "Compensación", etc.).
- Cada tipo muestra:
  - Icono (mapped por code).
  - Nombre + descripción corta.
  - Badge "Disponible" (P1) o "Próximamente" (P2).
  - Bloque "Quién aprueba" — chain legible: `Tu jefe → Rocío (RRHH) → Samantha (Gerente RRHH)`.
  - Bloque "Qué necesitas" — bullets cortos por tipo (hardcoded en `forms/registry.ts:helpInfo`).
  - Link "Ver SOP" → archivo en `Docs/SOPs, Formularios y Documentos/<sop_reference>.pdf`. Servido vía Next.js como recurso estático en `/sops/<filename>` (configurar `next.config.ts` para servir esa carpeta o copiarla a `public/sops/` en build).
  - Botón "Iniciar solicitud" (P1: link a `/solicitudes/nueva/[code]`; P2: deshabilitado con tooltip "Próximamente").

**Nota documental (Hrs Extras):** debajo de la categoría "Compensación" un callout: "*La autorización de Horas Extras para empleados ya trabajadas se hace dentro de Acción de Personal. La solicitud de autorización previa para trabajar horas extras estará disponible próximamente.*"

## 8. Listas y detalle

### 8.1 `/solicitudes` — Mis solicitudes
- Filtra por `requester_id = me.id`.
- Tabs/chips: `Todas | Pendientes | Aprobadas | Rechazadas`.
- Cards (mobile) o filas (desktop) con: request_number, tipo (icon + nombre), fecha, estado badge, "tiempo en estado actual".
- Click → `/solicitudes/[id]`.
- Empty state: "Aún no has creado ninguna solicitud" + CTA "Nueva solicitud".

### 8.2 `/solicitudes/[id]` — Detalle
**Visibilidad:** requester, approvers asignados, hr_admin.

**Layout:**
- Header: request_number + status badge + tipo + fecha enviada.
- "Datos de la solicitud" — render del `form_data` por tipo (componentes per-type, cada form exporta un `<DetailView />`).
- "Adjuntos" — lista con preview/download.
- "Línea de tiempo de aprobaciones" — vertical timeline:
  ```
  ● Solicitud creada por Juan Pérez · hace 2h
  ● Pendiente de aprobación · Pedro Ruiz (Tu jefe)
  ○ Pendiente · Rocío Olmedo (RRHH)
  ○ Pendiente · Samantha Kosmas (Gerente RRHH)
  ```
- "Acciones disponibles":
  - Si soy requester Y status='Borrador': botón "Cancelar".
  - Si soy approver pendiente del step actual: botones "Aprobar" + "Rechazar" (cada uno abre Dialog con campo de comentarios).
  - Si soy HR Y status='Aprobada' Y type='ACTUALIZACION_DATOS': botón "Aplicar al expediente".

### 8.3 `/admin` — Dashboard HR
**Acceso:** gated por `is_hr`. No-HR → redirect a `/inicio`.

**KPI cards:**
1. **Pendientes mías** — count de `request_approvals` donde `approver_id=me.id` AND `decision='Pendiente'`.
2. **Solicitudes esta semana** — `requests` con `date_submitted >= start_of_week()`.
3. **Vencidas** — `requests` con `status IN ('Enviada','En Revisión')` AND `date_submitted < now() - 5 días`.
4. **Por tipo** — pequeño bar chart por categoría (counts globales este mes).

**Tabla:** todas las solicitudes con filtros: estado, tipo, requester (search), fecha. Click → detalle.

## 9. Email — Resend

**Cliente:** `src/lib/email/client.ts` instancia Resend con `RESEND_API_KEY`.

**Helper:** `sendNotification(type, payload)`.
- Si `process.env.NOTIFICATION_TEST_EMAIL` está set → todos los emails van a esa dirección con el `to` original en el subject.
- Si `RESEND_API_KEY` está vacío/missing → log warning, no crashea (devMode silent).

**Templates** (HTML strings, no React Email — overhead innecesario):

Header común:
```html
<table style="background:#1B3A5C; padding:16px; width:100%">
  <tr><td>
    <span style="color:#F5A623; font-weight:bold; font-size:18px">ICONSA</span>
    <span style="color:#FFFFFF; font-size:14px; margin-left:8px">HumanOS</span>
  </td></tr>
</table>
```

Body common:
```html
<div style="max-width:560px; margin:0 auto; padding:24px; font-family:system-ui, sans-serif">
  <h2>{título}</h2>
  <p>{cuerpo}</p>
  <table style="background:#F5F5F5; padding:12px; font-family:monospace">
    <tr><td>Solicitud:</td><td>{request_number}</td></tr>
    <tr><td>Tipo:</td><td>{tipo}</td></tr>
    <tr><td>Solicitante:</td><td>{requester_name}</td></tr>
  </table>
  <a href="{link}" style="display:inline-block; background:#1B3A5C; color:#fff; padding:12px 24px; text-decoration:none; margin-top:16px">Ver Solicitud</a>
</div>
```

Footer común:
```html
<p style="color:#5A6272; font-size:12px; text-align:center; margin-top:24px">
  Este es un mensaje automático del sistema HumanOS de ICONSA. No responda a este correo.
</p>
```

**3 templates:**
1. `solicitud-enviada` — to: primer aprobador. Subject: `Nueva solicitud por aprobar: {request_number}`. CTA: "Ver y aprobar".
2. `solicitud-decidida` — to: siguiente aprobador. Subject: `Solicitud avanza para tu aprobación: {request_number}`.
3. `decision-final` — to: solicitante. Subject: `Tu solicitud {request_number} fue {Aprobada|Rechazada}`. Body con resumen.

**Sender:** `HumanOS <noreply@rein-eisenwerk.com>` (dominio verificado).

## 10. Module 1.5 — directorio + perfil read-only

### 10.1 `/directorio`
- Server component, lista `humanos.people` WHERE `status='Activo'`.
- Search input (client component) filtra por nombre/code/email/departamento.
- Filter pills: departamento (multi-select), oficina (multi-select).
- Card por persona: foto (placeholder si null), nombre, cargo, departamento, email, teléfono.
- Mobile: lista vertical. Desktop: grid 3 col.

### 10.2 `/perfil`
- Server component, lee `humanos.people` WHERE `auth_id = auth.uid()`.
- Read-only. Secciones: Identidad, Contacto, Laboral, Otros.
- CTA: "¿Necesitas actualizar algo?" → link a `/solicitudes/nueva/actualizacion-datos`.

## 11. Permisos / RLS — síntesis

| Recurso | employee | supervisor | hr_admin |
|---|---|---|---|
| Listar people activos (campos públicos) | ✓ | ✓ | ✓ |
| Ver people privados (cedula, fechas, etc.) | propio | propio | ✓ todos |
| Editar people | — | — | ✓ |
| Listar request_types | ✓ | ✓ | ✓ |
| Ver requests (mías) | ✓ | ✓ | ✓ |
| Ver requests donde soy approver | n/a | ✓ | ✓ |
| Ver TODAS las requests | — | — | ✓ |
| Submit request (propia) | ✓ | ✓ | ✓ |
| Submit en nombre de otro | — | — | ✓ |
| Decidir approval (pendiente, mía) | n/a | ✓ | ✓ |
| Aplicar ACT_DATOS al expediente | — | — | ✓ |
| `/admin` | — | — | ✓ |

## 12. Auth & role determination

`getMe()` (server-only, cached per request via `React.cache`):
1. `supabase.auth.getUser()` → si null → throw redirect to /login.
2. `SELECT * FROM humanos.people WHERE auth_id = user.id LIMIT 1`.
3. Si null → render página "Tu cuenta no está vinculada a un perfil de empleado. Contacta a HR."
4. Compute role:
   - Si `people.app_role` está set → usar como override.
   - Si `code IN ('KOSM01','OLM206','MAN943','MEN943')` → `hr_admin`.
   - Si tiene subordinados (`SELECT 1 FROM people WHERE supervisor_id = me.id LIMIT 1`) → `supervisor`.
   - Else → `employee`.
5. Return `{ ...person, role }`.

Middleware `src/middleware.ts`:
- Excluye `/login`, `/_next/*`, `/favicon.ico`, `/sops/*`.
- Si no hay sesión → redirect a `/login?next=...`.
- Si la ruta es `/admin/*` y role != hr_admin → redirect a `/inicio`.

## 13. Testing strategy (MVP — pragmática)

**No unit tests automatizados** para el MVP. Verificación manual + lint + build.

**Flujos críticos a probar manualmente antes de cerrar sesión:**
1. Login con Samantha (KOSM01) → ve `/admin` con cards reales.
2. Login con un empleado normal → no ve `/admin`.
3. Empleado envía VACACIONES → email llega a su supervisor → supervisor aprueba → email a Rocío → Rocío aprueba → email a Samantha → Samantha aprueba → email final al empleado. Status correcto en cada paso.
4. Préstamo $100 → 3 steps. Préstamo $300 → 4 steps (incluye Presidencia).
5. ACTUALIZACION_DATOS → al final Samantha hace "Aplicar al expediente" → cambios visibles en `humanos.people`.
6. Empleado intenta ver solicitud de otro empleado por URL directo → blocked (RLS).

**Verificación pre-deploy:**
- `npm run lint` — sin errores.
- `npx tsc --noEmit` — sin errores de tipo.
- `npm run build` — pasa.
- Vercel preview URL accesible.

**Deferred (Module 2 o post-MVP):** Playwright e2e, RLS policy tests con pgTAP.

## 14. Decisión documental: nombrado de columnas en form_data JSONB

Mantengo nombres de campos del PDF (en español, ej. `pago_vacaciones`, `monto_solicitado`) con snake_case. Razón: trazabilidad directa al PDF de origen + UI usa los mismos labels. Los keys en TypeScript que tocan estos JSONBs usan los mismos nombres. No traducir ni anglicizar form_data.

## 15. Out of scope explícito

- HR creando tipos nuevos via UI.
- Editor visual de approval_chain.
- Cancelación post-Enviada (solo Borrador → Cancelada; en MVP ni siquiera hay UI de Borrador).
- Versionado de requests (form_data inmutable post-submit).
- Audit log más allá de `request_approvals` decisions.
- Notificaciones in-app (badges en cards, sin push).
- Multi-idioma.

## 16. Decision Log

| Fecha | Decisión | Razón | Quién |
|---|---|---|---|
| 2026-04-28 | Roles semánticos en approval_chain (refactor schema) | Spec original imposible con roles genéricos | Code propone, James aprueba |
| 2026-04-28 | Sub-tipos de Acción Personal del PDF (no del spec) | PDF es canónico (regla del proyecto) | Code propone, James aprueba |
| 2026-04-28 | Actualización Datos: solo campos del PDF | El spec inventó campos que el PDF no tiene | Code propone, James aprueba |
| 2026-04-28 | ACTUALIZACION_DATOS requires_approval=true | Contradicción con flujo Rocío→Samantha | Code corrige seed |
| 2026-04-28 | Préstamo $250 = soft cap con escalación a Presidencia | IC-RH-D-02 dice "montos superiores pueden ser evaluados" | Code propone, James aprueba con UX nota |
| 2026-04-28 | Reclamo Pago como tabla 5×3 | PDF tiene tabla estructurada | Code propone, James aprueba |
| 2026-04-28 | Vacaciones soporta 1-3 rangos + radio de pago | PDF tiene esa estructura | Code propone, James aprueba |
| 2026-04-28 | Form schema hardcoded en TS, no JSONB en BD | Type safety + reglas custom + sin necesidad runtime de extensibilidad | James propone, Code adopta |
| 2026-04-28 | Module 0 = Fase 0 del plan, no spec separado | Plumbing sin decisiones de diseño | Code propone, James aprueba |
| 2026-04-28 | Module 1.5 (/directorio + /perfil read-only) incluido al final | Cierra checklist demoable | James push, Code adopta |
| 2026-04-28 | Engine atómico con 2 funciones Postgres + server actions | Atomicidad en BD, side effects (email) fuera | Code decide |
| 2026-04-28 | Estados: Aprobada es final excepto ACT_DATOS (→ Completada al apply) | Mapeo simple del state machine existente | Code decide |
| 2026-04-28 | Módulo Permisos pre-facto vs Hrs Extras post-facto: documentado en /ayuda | Confusión señalada por James | Code documenta |
| 2026-04-28 | Apply de ACT_DATOS al expediente: pareja/dependientes a JSONB en people, no nuevas columnas | Evita migración de schema; refactor en M2 si necesario | Code decide |
| 2026-04-28 | UI library: shadcn/ui base + Tailwind | Velocidad MVP, cero runtime extra | Code decide |
| 2026-04-28 | Sin Playwright/pgTAP en MVP — solo verificación manual + build/lint/tsc | Velocidad MVP | Code decide |

## 17. Open questions

Ninguna pendiente para iniciar implementación. Si surge algo durante la ejecución que afecte scope, lo documento en `Docs/CHANGELOG.md` y aplico la opción más simple que cumple el checklist (per instrucción del usuario).
