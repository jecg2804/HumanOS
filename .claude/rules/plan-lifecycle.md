# Ciclo de vida de plan files

Path canónico: `Docs/superpowers/plans/<slug>.md`

## Cuándo crear
- Tras brainstorming acordado, invocar writing-plans para tareas ~3+ commits.
- Un file por tarea.

## Qué contiene (y qué NO)
**Sí:** contexto, bloques/fases con pasos, archivos tocados, fuera de scope.
**No:** historia de commits (→ CHANGELOG), features diferidos (→ BACKLOG), aprendizajes (→ skills).

## Cuándo limpiar
- Tras cada bloque commiteado: marcar ✅ o eliminar del plan.
- Si supera 300 líneas: PARAR y limpiar.
- Al cerrar tarea completa: borrar el plan file.

## Integración
- Al inicio de sesión: leer TRAIL.md para ubicación.
- Al cerrar task: actualizar TRAIL.md.
- Al commitear bloque: eliminar ese bloque del plan.
