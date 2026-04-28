# Ciclo de vida de spec files

Specs viven en `Docs/superpowers/specs/` y `Docs/feature-specs/`.

## Specs de brainstorming (superpowers/specs/)
- Generados por brainstorming sessions
- Capturan decisiones arquitectónicas
- Se archivan cuando se implementan (no borrar — son registro de decisiones)

## Feature specs (feature-specs/)
- Escritos por Claude Chat, 200-400 líneas por módulo
- Son la referencia para implementación
- Actualizar DESPUÉS de implementar + commitear spec y código juntos
- Incluir Decision Log al final para prevenir drift
