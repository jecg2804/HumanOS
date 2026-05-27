# 09-ESTADO-ACTUAL.md — Snapshot live del proyecto

**Última actualización**: sesión 2026-05-27 (BD ready post-migrations 015-025 + decisiones finales scope + invite codes generados)

**Owner update**: Claude Chat. Este es el doc más volátil — actualizar cada sesión con "qué se hizo, qué sigue, qué bloqueo existe".

---

## Estado high-level

**Fase actual**: BD foundational COMPLETA. Pre-overnight Code listo para arrancar.

**Decisión grande pendiente**: NINGUNA. Stack decidido, scope decidido (F1-F39), schemas decididos, modes decididos, BD pre-configurada con 24 tipos de solicitud + chains correctas.

**Próxima acción**: Regenerar docs (en curso), después generar prompt inicial Code para sesión grill-with-docs.

---

## Base de datos — estado verificado post-migrations

### Migrations aplicadas esta sesión (12 totales)

| # | Migration | Resultado |
|---|---|---|
| 015 | create_hr_invite_codes | ✅ Tabla creada con RLS + 3 policies + 5 COMMENTs |
| 016 | fix_hr_team_app_roles_and_constraint | ✅ CHECK reducido a 4 valores. SCD-2: Samantha/Rocío/Milagros/Jerelyn → hr_admin / Rodrigo → president |
| 017 | populate_auth_users_allowed_apps | ✅ 48 auth.users con `["movimientOS"]`. 0 humanOS aún (esperado, sign-up pendiente) |
| 018 | seed_8_categoria_b_request_types | ✅ 8 nuevos tipos: CERTIFICACION_LABORAL, CONSTANCIA_NO_ADEUDO, COPIA_CONTRATO, COPIA_COLILLA, CAMBIO_CUENTA_BANCO, CAMBIO_DEPENDIENTES, SOLICITUD_EPP, REPORTE_INCIDENTE |
| 019 | add_received_processed_columns_tickets | ✅ Columnas R8 received_by/at + processed_by/at |
| 020 | redesign_approval_chain_template_jsonb | ✅ Todos los 24 tipos con `{mode, visibility, steps[]}` |
| 020b | add_president_to_sop_chains | ✅ President step agregado a VACACIONES, HORAS_EXTRAS, ACCION_PERMISOS, DESCUENTO per SOP |
| 021 | add_manual_entry_columns_tickets | ✅ Columnas R25 manual_entry + created_by_hr_admin + index |
| 022 | create_hr_user_settings | ✅ Tabla creada + 3 policies + 370 backfilled |
| 023 | seed_invite_codes_bootstrap | ✅ 6 codes (5 equipo HR/president + 1 VP Ferrer) |
| 024 | add_files_category_constraint | ✅ CHECK con 13 valores válidos incluyendo `original_paper_form` |
| 025 | add_hr_helper_functions | ✅ `hr.current_app_role()` + `hr.has_direct_reports()` + trigger auto-create user_settings |

### Schemas (verificado vía Supabase MCP)

| Schema | Tablas | Status HumanOS |
|---|---|---|
| `public.*` | 44 | INTOCABLE — MovimientOS producción |
| `payroll.*` | 9 | INTOCABLE — sistema planillas |
| `humanos.*` | 5 | INTOCABLE — demo legacy v1 archivo |
| `hr.*` | **11** (+1 invite_codes + 1 user_settings; sin contar las que ya estaban hubo 10 → 12 con las 2 nuevas) | HumanOS principal — master data cross-app |
| `requests.*` | 9 | HumanOS principal — core tickets |
| `docs.*` | 11 | HumanOS — KB, SOPs, signatures |
| `workflows.*` | 4 | HumanOS futuro — onboarding/offboarding |
| `performance.*` | 7 | HumanOS futuro v2 |
| `learning.*` | 8 | HumanOS futuro v2 |
| `audit.*` | 1 | HumanOS — log inmutable cross-app |
| `notifications.*` | 1 | HumanOS — outbox |
| `files.*` | 1 | HumanOS — storage polimórfico (`uploads`) |

Total HumanOS v2: **54 tablas con ~94 RLS policies activas** (88 previas + 3 invite_codes + 3 user_settings).

### Data crítica verificada

| Tabla | Rows | Notas |
|---|---|---|
| `hr.people` | **370** | 184 Activos + 186 Inactivos/históricos. Consolidación 3-way exitosa |
| `hr.employments` | 375 (incrementó por SCD-2 corrections) | 184 con `is_current=TRUE` |
| `hr.user_settings` | **370** | Backfilled. Default: email + in_app enabled, language='es', timezone='America/Panama' |
| `hr.invite_codes` | **6** | Bootstrap: Samantha, Rocío, Milagros, Jerelyn, Rodrigo, Javier Ferrer |
| `hr.contacts` | 289 | TODO `contact_type='own'`. ZERO emergency (a llenar por sign-up wizard) |
| `hr.addresses` | 128 | Solo personas con address en fuente original |
| `hr.medical_info` | 43 | blood_type/health_notes/css_number normalizados |
| `hr.org_units` | 14 | Departamentos canónicos |
| `hr.positions` | 60 | Cargos canónicos |
| `hr.locations` | 15 | 12 activas |
| `requests.types` | **24** | 18 top-level + 6 sub-types ACCION_PERSONAL. Todos con `{mode, visibility, steps[]}` |
| `auth.users` | 48 | Todos con `raw_app_meta_data.allowed_apps = ["movimientOS"]`. HumanOS users serán agregados via sign-up |

### Mapping definitivo tipos → mode (24 tipos)

**Con president step (8 tipos, per SOP)**:
- PRESTAMO, VACACIONES, ACCION_AUMENTO_SALARIO, ACCION_DESPIDO, ACCION_LIQUIDACION, ACCION_HORAS_EXTRAS, ACCION_PERMISOS, ACCION_DESCUENTO

**parallel sin president (5 tipos, no aplica SOP gerencia)**:
- PERMISO (horas), RECLAMO_PAGO (SLA 48h), CAPACITACION, SOLICITUD_EPP, REPORTE_INCIDENTE (SLA 24h)

**any_of_hr (5 tipos, documentos)**:
- CARTA_TRABAJO, CERTIFICACION_LABORAL, CONSTANCIA_NO_ADEUDO, COPIA_CONTRATO, COPIA_COLILLA

**direct_hr_admin (5 tipos)**:
- ACTUALIZACION_DATOS, CAMBIO_CUENTA_BANCO, CAMBIO_DEPENDIENTES, REFERENCIA_LABORAL, ENTREVISTA_SALIDA

**parent_only (1 tipo)**:
- ACCION_PERSONAL (parent — sub-tipos llevan el chain)

### Equipo HR + Gerencia (verificado BD)

| Persona | employee_code | Cargo | app_role | auth_id | Invite code bootstrap |
|---|---|---|---|---|---|
| Samantha Kosmas | KOSM01 | Gerente RRHH y ADM | `hr_admin` | NULL | `F1F3D92A` |
| Rocío Olmedo | OLM206 | Oficial RRHH | `hr_admin` | NULL | `F1F738DF` |
| Milagros Manyoma | MAN943 | Oficial Planillas | `hr_admin` | NULL | `A4046851` |
| Jerelyn Mendoza | MEN943 | Asistente Adm RRHH | `hr_admin` | NULL | `A65376E1` |
| Rodrigo Eisenmann | EIS772 | Presidente | `president` | NULL | `8917F9DB` |
| Octavio Javier Ferrer | FER337 | Vice Presidente | `admin` (a revisar) | NULL | `A16E6D56` |

**Otros gerentes en BD** (potencial "Gerencia General" en SOPs — validar con Samantha):
- Adolfo Valderrama (VAL130, Gerente — Equipo)
- Argelia Ugarte (UGA301, Gerente — Cumplimiento)
- Jorge D. Beluche (BEL359, Gerente Calidad)
- Millie Marie Monteza (MON432, Gerente Calidad)
- Olmedo Zamora (Gerente Equipo)
- Damaris Rios (RIO806, Gerente Finanzas y Contabilidad)
- Andrés Solís (SOL236, Gerente Proyecto)

---

## Decisiones grandes finalizadas esta sesión

1. **Triple stack docs**: Project Files (Chat memory) / `docs/` repo (Code operativo) / `iconsa-knowledge` wiki futuro
2. **CLAUDE.md raíz minimal** ≤4.3KB con @imports condicionales
3. **Workflow paralelo TOTAL**: todos los stakeholders requeridos notificados desde día 0
4. **RRHH siempre incluido desde día 0** en todos los tipos no `any_of_hr`/`direct_hr_admin`
5. **$250 NO bloqueante** en PRESTAMO — cap operacional, todos los préstamos van al chain completo
6. **Eliminado `'supervisor'` como app_role** — emerge contextualmente de `hr.employments.supervisor_id`
7. **3 modes finales** + parent_only: parallel, direct_hr_admin, any_of_hr, parent_only
8. **R26 nueva: SOP-driven approval chains** — NO desviarse del SOP sin validar con Samantha
9. **Manual entry F32** — sin columna nueva `original_paper_attachment_id`. Usa `files.uploads` polimórfico con `category='original_paper_form'`
10. **F39 nueva: admin viewer approval chains Nivel A** — read-only en MVP. Edit JSON raw (B) y visual editor (C) en v1.1
11. **Sign-up flow unificado** con triple validación (invite_code + national_id + employee_code opcional) + identificador email O phone + multi-app detection (append `humanOS` a `allowed_apps`)
12. **`hr.employments.app_role` CHECK** reducido a 4 valores: `employee`, `hr_admin`, `president`, `admin`
13. **Helper functions** agregadas: `hr.current_app_role()`, `hr.has_direct_reports()` + auto-trigger user_settings on hr.people insert
14. **38 → 39 features MVP**: F1-F38 + F39 admin viewer chains

---

## Repositorio HumanOS

**Deploy actual**: https://human-os-nine.vercel.app (Module 1 sobre `humanos.*` legacy)
**Repo path**: `C:\Users\Jaime Cucalon\Documents\iconsa_apps\HumanOS`
**Branch**: `main`
**Branch**: trabajo directo en `main` (greenfield)

---

## Claude Code setup (post-recovery)

- Claude Code 2.1.150
- Windows 11 / PowerShell 5.1
- 4 marketplaces: claude-code-plugins, openai-codex, claude-plugins-official, superpowers-marketplace
- ~20 plugins instalados (superpowers, supabase, vercel, playwright, frontend-design, context7, etc.)
- Hooks ASCII puro v7 aplicados
- `.claude/settings.json` strict-schema sin BOM
- MCPs activos: Supabase, GDrive, Notion, Vercel, Filesystem

**Pendiente Claude Code** (no crítico para arrancar):
- 4 custom ICONSA skills
- 4 subagents
- mattpocock plugins install (grill-with-docs, handoff, diagnose, git-guardrails)
- Smoke tests bedrock

---

## Lo que sigue

### Sesión actual (cierre)

1. ✅ Migrations BD 015-025 aplicadas
2. 🔄 Regenerar docs (en curso)
3. 🟡 Generar prompt inicial para Code (sesión grill-with-docs)

### Sesión siguiente (Code arranca)

1. James pega docs Project Files actualizados
2. James commit docs/* del repo
3. James abre Code, pega prompt inicial grill-with-docs
4. Code lee CLAUDE.md raíz + @imports + Project Files (vía MCP) opcional
5. Code corre **grill-with-docs** session — discute con James detalles finos, vocabulary, edge cases
6. Code descarga SOPs de GDrive a `docs/sops/*.pdf` + extrae markdown a `docs/sops/*.md`
7. Code completa `docs/form-catalog.md` con secciones detalladas por tipo
8. Code crea 4 ICONSA custom skills + 4 subagents
9. Smoke tests bedrock
10. Code trabaja directo en `main`
11. Spec generation: brainstorming → writing-plans para features ejemplo

### Overnight #1 execution

Code ejecuta phases per `06-FRAMEWORK-CLAUDE-CODE.md` con harness Superpowers + grill-with-docs + custom ICONSA skills. Output: `<promise>MVP_COMPLETE</promise>`.

---

## Bloqueos / riesgos

| Riesgo | Mitigación |
|---|---|
| Overnight no completa | HANDOFF.json via hook PreCompact. Resume en próxima sesión |
| Form schemas mal diseñados se propagan | Code lee SOPs primero, skill `iconsa-form-implementation` con templates |
| RLS policies rotas | Skill `iconsa-rls-validation` + subagent `rls-validator` antes de feature done |
| PDF templates no replican formato SOP | Subagent `pdf-template-tester` + iteración humano post-overnight |
| Personal de campo no completa sign-up | F32 manual entry como fallback. hr_admin completa en su nombre |
| Encoding BOM/non-ASCII regresión | Hook PostToolUse valida + R23 + audit script |
| Approval chain ajustes futuros (Samantha valida con uso real) | F39 admin viewer + edit JSON raw v1.1 |
| "Gerencia General" en SOP ≠ "Presidente" | Por ahora `president_user` = Rodrigo. Si Samantha confirma incluir VP/otros gerentes, expandir resolver a `gerencia_user_list` (array UUIDs paralelo) |

---

## Métricas progreso

**Sesión actual (Chat)**:
- ✅ 12 migrations BD aplicadas
- ✅ 14 docs Project Files auditados
- 🔄 10 docs críticos regenerándose
- 🟡 Prompt inicial Code pendiente

**Pre-overnight #1**: ~85% (BD ready, docs regenerándose, pendientes Code skills + SOPs descarga + smoke tests)

**Overnight #1 execution**: 0% (no comenzado)

---

## Quick reference

**Próxima sesión Chat al abrir**:
1. Verificar este doc (`09-ESTADO-ACTUAL.md`) primero
2. Si Code completó overnight, verificar `docs/CHANGELOG.md` del repo
3. Si surge cambio scope, actualizar `02-MVP-SCOPE.md` + crear ADR

**Próxima sesión Code al abrir**:
1. Lee `CLAUDE.md` raíz (≤4.3KB)
2. Sigue `docs/business-rules.md` para R1-R26
3. Sigue `docs/schemas-permisos.md` para qué tocar
4. Sigue `docs/form-catalog.md` para implementar cada form (Code completa este doc primero leyendo SOPs)
5. Sigue `docs/iconsa-knowledge.md` para dominio
6. Usa skills `iconsa-*` cuando aplique
7. Documenta decisiones en `docs/adr/`
8. Mantén `docs/CHANGELOG.md` + `docs/ROADMAP.md` per commit/feature
