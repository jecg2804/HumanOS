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

1. Chat actualiza docs numerados (especialmente `09-ESTADO-ACTUAL.md`) — viven en repo `docs/`, son single source para ambas audiencias
2. Chat genera **prompt inicial Code** con:
   - Resumen contexto actual
   - Trigger sesión `grill-with-docs` (mattpocock, ya instalada en `.claude/skills/`)
   - Lista de tareas concretas
   - Referencia a docs via Filesystem MCP (si Code los necesita explícitamente — Code igual los lee via @imports CLAUDE.md)
3. James commit docs actualizados al repo HumanOS
4. James abre Code en repo + pega prompt inicial
5. Code lee `CLAUDE.md` raíz + @imports condicionales + arranca grill-with-docs si aplica

### Code → Chat (al completar overnight o cuando James reporta)

1. Code mantiene `docs/CHANGELOG.md` con entries per feature
2. Code mantiene el status por grupo en `02-MVP-SCOPE.md` + `09-ESTADO-ACTUAL.md`
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

## Formato docs paste (Chat)

Cuando James pega docs al Chat:

```
[Pasted from repo HumanOS docs/]

00-INDEX.md
01-VISION.md
02-MVP-SCOPE.md
03-ROADMAP-POST-MVP.md
04-DOMAIN-RRHH.md
05-BUSINESS-RULES.md
06-FRAMEWORK-CLAUDE-CODE.md
07-SCHEMAS-PERMISOS.md
08-ADRs.md
09-ESTADO-ACTUAL.md
10-HANDOFF-PROTOCOL.md
11-MDM-PRINCIPLES.md
12-SOR-MATRIX.md
13-INTEGRATIONS-INDEX.md
CONTEXT.md
```

Total 14 numerados + CONTEXT.md (`CHANGELOG.md` y `HANDOFF.json` son operacionales — Chat raramente los necesita).

---

## Layout repo docs

Estructura real bajo `docs/`:

```
docs/
├── 00-INDEX.md         (índice + filosofía triple stack)
├── 01-VISION.md a 13-INTEGRATIONS-INDEX.md
├── CONTEXT.md          (vocabulario vivo, Code mantiene via grill-with-docs)
├── CHANGELOG.md        (entries por feature/version, Code mantiene)
├── adr/                (ADR Code-level 0001-0008+, Code genera durante implementación)
├── sops/               (PDFs originales GDrive + markdown extraído)
└── superpowers/plans/  (planes Code-generated, algunos untracked)

CLAUDE.md (raíz repo) — entry point con @imports condicionales a docs/
PROJECT_CONSTITUTION.md (raíz repo) — principios non-negotiable
HANDOFF.json (docs/) — generado por hook PreCompact, gitignored
```

---

## Bootstrap invite codes (entregar personalmente)

| Code | Persona | Acción esperada |
|---|---|---|
| `F1F3D92A` | Samantha Kosmas | Usar al abrir https://humanos.rein-eisenwerk.com/onboarding/F1F3D92A |
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
