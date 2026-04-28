# Rule: Supabase — Read-Only

Claude Code NUNCA escribe a la base de datos directamente. Supabase MCP está configurado en modo read-only.

## Cambios de BD

Los cambios de BD los ejecuta Claude Chat (web) con aprobación explícita de James. El patrón es:

1. Code identifica que necesita un cambio de BD
2. Code documenta el SQL necesario en `Docs/CHANGELOG.md` como `[bd-pending]`
3. James lleva el SQL a Claude Chat → Chat ejecuta con aprobación
4. Entrada se actualiza a `[bd]` en CHANGELOG

## Queries

- Verificar schema via Supabase MCP antes de tocar código que interactúa con BD
- Para schema `humanos`: usar `.schema('humanos').from('table')`
- Para schema `public`: usar `.from('table')` normal
- NUNCA asumir estructura de tablas — siempre verificar con MCP
