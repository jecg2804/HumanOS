Corregir: $ARGUMENTS

## Workflow
1. Entender el bug — reproducirlo mentalmente o con Playwright
2. Encontrar el código relevante (grep, read files)
3. Si toca BD: verificar schema via Supabase MCP
4. Implementar el fix (mínimo cambio necesario)
5. Verificar que el fix funciona
6. Commit: `fix: descripción del bug corregido`
7. Documentar en `Docs/CHANGELOG.md`
