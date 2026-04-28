# Rule: Uso de Herramientas

## Modelo de 3 actores

- **Claude Chat**: arquitecto, planifica, escribe a Supabase (con aprobación de James), genera prompts goal-oriented.
- **Claude Code (tú)**: implementa, lee codebase, verifica su propio trabajo. NUNCA escribe a BD.
- **James**: decisiones, aprobaciones, testing, contexto de negocio.

## Lectura eficiente al inicio de sesión

1. `Docs/TRAIL.md` — dónde estamos en el árbol de tareas
2. `Docs/CHANGELOG.md` — últimas entradas, contexto reciente
3. `humanos-mvp-spec.md` — solo la sección relevante a la tarea
4. Supabase MCP — verificar schema de las tablas que vas a tocar

## Superpowers — obligatorio

- **Feature nuevo (3+ commits esperados)** → invocar `brainstorming` ANTES de escribir código.
- **Después de brainstorming aprobado** → `writing-plans` genera plan en `Docs/superpowers/plans/`
- **Ejecución del plan** → `executing-plans`
- **Bug complejo (3+ archivos)** → `systematic-debugging`
- **Después de step mayor** → `requesting-code-review`
- **Fix trivial (1 archivo, obvio)**: decir "skip brainstorming" explícitamente.

## Supabase MCP — read-only

SIEMPRE antes de tocar código que interactúa con BD: verificar schema via MCP.
NUNCA escribir a BD. Documentar cambios necesarios en CHANGELOG como `[bd-pending]`.

## Playwright MCP

Usar para QA visual: verificar que páginas cargan, formularios funcionan, responsive.
