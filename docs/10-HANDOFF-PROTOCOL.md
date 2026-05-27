# 10-HANDOFF-PROTOCOL.md — Cómo Chat-Code-James intercambian estado

**Última actualización**: 2026-05-27

---

## Tres entidades que colaboran

1. **Chat (Claude.ai conversational)** — strategy, decisiones grandes, dominio extenso, BD migrations bloqueantes, mantiene Project Files
2. **Code (Claude Code CLI agent)** — implementación, repo, tests, deploy, mantiene `docs/` operativos
3. **James (humano)** — owner final, valida decisiones, paste docs Chat→Code, commit repo

---

## Direcciones de handoff

### Chat → Code (al arrancar sesión Code nueva)

1. Chat actualiza Project Files (especialmente `09-ESTADO-ACTUAL.md`)
2. Chat actualiza repo docs (`business-rules.md`, `schemas-permisos.md`, `iconsa-knowledge.md`, `form-catalog.md`)
3. Chat genera **prompt inicial Code** con:
   - Resumen contexto actual
   - Trigger sesión `grill-with-docs` (mattpocock)
   - Lista de tareas concretas
   - Referencia a Project Files vía MCP Filesystem (si Code los necesita)
4. James pega Project Files al Chat (en cada sesión Chat nueva)
5. James commit repo docs al repo HumanOS
6. James abre Code en repo + pega prompt inicial
7. Code lee `CLAUDE.md` raíz + @imports + arranca grill-with-docs

### Code → Chat (al completar overnight o cuando James reporta)

1. Code mantiene `docs/CHANGELOG.md` con entries per feature
2. Code mantiene `docs/ROADMAP.md` con pendientes
3. Code genera `docs/adr/*` con decisiones técnicas
4. Code mantiene `docs/CONTEXT.md` con vocabulary vivo
5. Al final overnight, Code emite `<promise>MVP_COMPLETE</promise>` o `<promise>PARTIAL_MVP</promise>`
6. James reporta a Chat: copia summary final Code → Chat
7. Chat actualiza `09-ESTADO-ACTUAL.md` reflejando nuevo state

### Code ↔ Code (entre sesiones overnight con context compactation)

1. Hook `PreCompact` genera `HANDOFF.json` automático antes de compactación
2. Próxima sesión Code lee `HANDOFF.json` al arrancar
3. `mattpocock handoff` skill estructura el HANDOFF.json

---

## Formato Project Files paste

Cuando James pega Project Files al Chat:

```
[Pasted from /home/claude/humanos-docs-v9/project-files/]

00-INDEX.md
01-VISION.md
02-MVP-SCOPE.md
03-ROADMAP-POST-MVP.md
04-DOMAIN-RRHH.md
06-FRAMEWORK-CLAUDE-CODE.md
08-ADRs.md
09-ESTADO-ACTUAL.md
10-HANDOFF-PROTOCOL.md
```

Total ~8-10 files concatenados o pasted individualmente.

---

## Formato repo docs commit

Cuando James commit al repo:

```
docs/
├── CLAUDE.md (raíz repo, no /docs/)
├── business-rules.md
├── schemas-permisos.md
├── iconsa-knowledge.md
├── form-catalog.md (skeleton — Code completará leyendo SOPs durante grill-with-docs)
├── CONTEXT.md (vacío inicial — Code llena durante implementación)
├── CHANGELOG.md (vacío inicial)
├── ROADMAP.md (vacío inicial — Code refleja pendiente per feature)
└── adr/
    └── (vacío inicial — Code genera durante implementación)
```

Commit message: `docs: setup HumanOS v2 documentation foundation (R1-R26, 39 features, modes finales)`

---

## Bootstrap invite codes (entregar personalmente)

| Code | Persona | Acción esperada |
|---|---|---|
| `F1F3D92A` | Samantha Kosmas | Usar al abrir https://human-os-nine.vercel.app/onboarding/F1F3D92A |
| `F1F738DF` | Rocío Olmedo | Idem |
| `A4046851` | Milagros Manyoma | Idem |
| `A65376E1` | Jerelyn Mendoza | Idem |
| `8917F9DB` | Rodrigo Eisenmann | Idem |
| `A16E6D56` | Octavio Javier Ferrer | Idem |

Expiran 2026-08-25 (90 días). Si expiran sin uso, hr_admin regenera vía `/admin/empleados/[id]/invitar`.

---

## Quick handoff cheat sheet

| Situación | Acción |
|---|---|
| Nueva sesión Chat | Paste Project Files completos al inicio |
| Nueva sesión Code | Abrir Code en repo, pegar prompt inicial Chat-generado |
| Code completó overnight | James reporta summary a Chat, Chat actualiza 09-ESTADO-ACTUAL |
| Cambio decisión grande | Chat actualiza Project Files + crea/actualiza ADR + notifica James |
| Bug en producción | Code corre `diagnose` skill, genera report, James reporta a Chat |
| Migration BD necesaria | Chat ejecuta vía Supabase MCP con approval per bloque James |

---

## Anti-patterns handoff

- ❌ Chat ejecutando código en repo HumanOS (no es su rol — Code lo hace)
- ❌ Code tomando decisiones grandes sin consultar (cuando aplica, escala vía grill-with-docs)
- ❌ James perdiendo invite codes (entregar personalmente Y mantener registro)
- ❌ Sessions Code sin handoff (siempre genera HANDOFF.json antes de compact)
- ❌ Project Files quedando obsoletos (Chat actualiza per sesión)
- ❌ Repo docs duplicando Project Files (son audiencias distintas)
