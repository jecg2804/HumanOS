# ROADMAP.md — HumanOS macro roadmap (fuente única de verdad)

**Última actualización**: 2026-05-29 (post-auditoría 2026-05-29 + pivot overnight→estructurado + estrategia forms-first)
**Owner**: Code (ingeniería end-to-end). James decide negocio (SOP/ADR-0011) + clicks de infra (env vars, dashboard).

> Este es el roadmap **macro** (la escalera completa + tag plan + status). El detalle de scope por feature vive en [02-MVP-SCOPE.md](02-MVP-SCOPE.md); lo diferido post-MVP en [03-ROADMAP-POST-MVP.md](03-ROADMAP-POST-MVP.md); el snapshot live en [09-ESTADO-ACTUAL.md](09-ESTADO-ACTUAL.md).

---

## North star

Reemplazar Humand + formularios papel ICONSA con una plataforma RRHH a nivel de **BambooHR / Personio** (no Workday — ese tier es sobre-ingeniería para ~370 personas, construcción, Panamá). Autoservicio mobile-first, workflows de aprobación configurables, gestión documental, y eventualmente time-off con accrual, analytics e integraciones MDM.

## Principio de ejecución (post-pivot)

El plan original era un **overnight build** (39 features breadth-first en una noche). No funcionó. Ahora trabajamos **estructurado, value-per-commit**: módulos completos y usados, no esqueletos.

**Insight clave — "forms-first" = "engine-first":** los 24 formularios NO son 24 proyectos. Son **configuración JSONB sobre 1 engine** (FormEngine + ApprovalEngine + ChainResolver). El form #1 cuesta ~90% del esfuerzo (construir el engine); los #2–#24 cuestan config + seed + 1 test E2E. Por eso el trabajo real es **1 engine impecable + 24 seeds en oleadas priorizadas**.

---

## Escalera de grupos + status

| Group | Rango | Contenido | Status | Tag |
|---|---|---|---|---|
| **Group 1 — Foundation** | F2, F3 | Login, AppShell | ✅ shipped | v0.0.1 |
| **Group 2 — Onboarding** | F1, F4, F5 + emergencia/médica + acks + /perfil base + notif + Cron | ✅ shipped (no validado en prod: 0 onboarded) | v0.0.2 |
| **Batch H — Hardening** | Auditoría 2026-05-29 P2: Sentry/obs, lint guard tokens, sync docs | 🟡 en curso | v0.0.3-pre |
| **Group 3 — Perfil/Directorio** (track paralelo) | F6, F7 (SCD-2), F8 | Autoservicio + smoke test del path `hr` | ⏳ próximo | v0.0.3 |
| **Pre-engine** | ADR-0011 BL-2..7 (decisiones James) + data layer (leave_balances, MDM) + seed form_schema | ⏳ desbloqueo | — |
| **Group 4 — Engines** | E1 FormEngine, E2 ApprovalEngine, E3 ChainResolver, E4 Stamp, E5 Pdf, E6 Notification + slice vertical CARTA_TRABAJO | ⏳ ruta crítica | v0.0.4 |
| **W1 — Forms Documentos** | CARTA_TRABAJO, CERTIFICACION, CONSTANCIA_NO_ADEUDO, COPIA_CONTRATO, COPIA_COLILLA (`any_of_hr`) | ⏳ pending | v0.0.5 |
| **W2 — Forms Operación/Seguridad** | SOLICITUD_EPP, REPORTE_INCIDENTE, PERMISO, RECLAMO_PAGO, ACTUALIZACION_DATOS, CAMBIO_CUENTA, CAMBIO_DEPENDIENTES | ⏳ pending | v0.0.6 |
| **W3 — Forms Licencias/Comp** | VACACIONES (necesita ledger), PRESTAMO, ACCION_PERSONAL +6 subtipos, CAPACITACION, REFERENCIA_LABORAL, ENTREVISTA_SALIDA | ⏳ pending | v0.0.7 |
| **Group 7 — Admin/UI + KB** | F28-F31 (/solicitudes, /admin dashboard), F33 settings, F35 search, F37 audit viewer, F9 KB | ⏳ pending | v0.1.0 |

> Mapeo F-number ↔ feature en [02-MVP-SCOPE.md](02-MVP-SCOPE.md). Los grupos 5-6 del scope original se reorganizan aquí en oleadas W1/W2/W3 por dependencia, no por categoría A/B.

---

## Estrategia de dos tracks

```
TRACK A — ruta crítica (forms)          TRACK B — track paralelo (visible, bajo riesgo)
──────────────────────────────         ───────────────────────────────────────────────
Batch H (hardening + docs sync)    │
ADR-0011 draft → James aprueba     │    Group 3: Perfil F6/F7 + Directorio F8
data layer (leave_balances, MDM)   │    (smoke test path hr con usuarios reales)
        ↓                          │
Group 4 engines + CARTA_TRABAJO    │
W1 → W2 → W3 (seeds en config)     │
        ↓
Group 7 Admin/UI + KB
```

Track B llena el wall-clock mientras Track A espera decisiones de negocio (ADR-0011). No es desvío: Group 3 valida el path `hr` (hoy 0 onboarded) y es 100% independiente del engine.

---

## Tag plan

| Tag | Entrega |
|---|---|
| v0.0.1 | Group 1 Foundation ✅ |
| v0.0.2 | Group 2 Onboarding ✅ |
| v0.0.3 | Batch H + Group 3 (Perfil/Directorio) |
| v0.0.4 | Group 4 engines + slice vertical CARTA_TRABAJO end-to-end |
| v0.0.5 | W1 Documentos (5 forms) |
| v0.0.6 | W2 Operación/Seguridad (7 forms) |
| v0.0.7 | W3 Licencias/Compensación (VACACIONES + comp) |
| v0.1.0 | Group 7 Admin/UI + KB → MVP funcional completo |

---

## Pendientes activos (detalle en 09-ESTADO-ACTUAL.md)

- **Batch H** (en curso): Sentry/observabilidad (BE-3, DSN lo setea James), Vercel Analytics, lint guard contra hex hardcoded, sync docs (CLAUDE.md, 00-INDEX, CONSTITUTION, 07-SCHEMAS, CHANGELOG).
- **ADR-0011 BL-2..7** (bloquea Group 4): self-approval presidente, SLA escalación, delegación, `requests.next_ticket_number` + reset anual, enum `Devuelta_Info`, `form_schema` source en seeds. Code redacta defaults desde SOPs; James aprueba.
- **Data layer forms**: `leave_balances` + accrual ledger (gap #1, table-stakes para VACACIONES), `hr.people_external_ids` (MDM), columnas réplica comp, seed `form_schema` de 15 tipos.
- **Diferido P3**: FK indexes (P2.23), COMMENT ON COLUMN backfill (P2.24), DB-1 audit triggers (con Group 4).

## Toolstack adiciones recomendadas (para paridad de mercado)

- **shadcn/ui** (Radix + Tailwind 4) — primitivos accesibles, resuelve a11y (FE-3) y consistencia de los 24 forms. Antes de W1.
- **react-hook-form + Zod** — validación del FormEngine dinámico.
- **@react-pdf/renderer** o Puppeteer (E5) — cartas/certificaciones W1.
- **Sentry + Vercel Analytics** — observabilidad (Batch H).
- **Twilio WhatsApp** — adelantar de v1.1: el personal de campo no usa email; es adopción, no lujo.
- **Postgres full-text (pg_trgm)** — KB + search global (no requiere Algolia a 370 usuarios).
- **Documenso** — e-sign legal Panamá (v1.1, schema listo).

Diferidos post-MVP completos en [03-ROADMAP-POST-MVP.md](03-ROADMAP-POST-MVP.md).
