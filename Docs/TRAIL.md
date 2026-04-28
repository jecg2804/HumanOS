# HumanOS — Trail (Posición Actual)

## Árbol de tareas

```
HumanOS MVP
├── [DONE] Schema humanos creado en Supabase
├── [DONE] Data importada del Excel (239 personas, 12 tipos de solicitud)
├── [DONE] Spec + Plan de Module 1
│   ├── Docs/superpowers/specs/2026-04-28-module-1-solicitudes-design.md
│   └── Docs/superpowers/plans/2026-04-28-module-1-solicitudes-plan.md
├── [DONE] Module 1 — Sistema de Solicitudes (36 tasks, 35 commits)
│   ├── [DONE] Fase 0 — Foundation (scaffold, auth, shell, resend, storage, sops, seeds)
│   ├── [DONE] Fase 1 — Migrations (helpers, submit/decide RPCs, reseed chains, RLS)
│   ├── [DONE] Fase 2 — Engine wiring (submit, decide, apply ACT_DATOS server actions)
│   ├── [DONE] Fase 3 — 5 forms P1 (registry + Vacaciones + AccionPersonal + Prestamo + ActDatos + ReclamoPago)
│   ├── [DONE] Fase 4 — Pages (/ayuda, /solicitudes/*, /admin)
│   ├── [DONE] Fase 5 — Module 1.5 (/directorio, /perfil)
│   └── [DONE] Fase 6 — MANUAL_VERIFICATION + changelog
├── [PENDING] Push to origin/main → Vercel preview URL
├── [PENDING] Smoke test end-to-end via Docs/MANUAL_VERIFICATION.md
├── [BACKLOG] Module 2 — Expediente del empleado (HR view)
│   └── /admin/empleados/[id] con historial de solicitudes
├── [BACKLOG] P2 forms (PERMISO, CONSTANCIA_TRABAJO, REFERENCIA_LABORAL, etc.)
├── [BACKLOG] Aplicación de fallback C — fila 'Solicita Info' explícita cuando supervisor=NULL
└── [BACKLOG] Cleanup script de attachments huérfanos en Storage
```

## Source files

- Spec: `Docs/superpowers/specs/2026-04-28-module-1-solicitudes-design.md`
- Plan: `Docs/superpowers/plans/2026-04-28-module-1-solicitudes-plan.md`
- Tasks state: `Docs/superpowers/plans/2026-04-28-module-1-solicitudes-plan.md.tasks.json`
- Manual verification: `Docs/MANUAL_VERIFICATION.md`
- BD migrations: `supabase/migrations/2026042*_*.sql` (7 files, todas aplicadas)
