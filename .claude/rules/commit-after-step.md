# Rule: Commit After Step

Después de completar cada step de un plan o cada fix verificado, hacer commit inmediatamente.

## Formato de commit

```
feat: descripción corta en inglés
fix: descripción corta en inglés
docs: descripción corta en inglés
chore: descripción corta en inglés
refactor: descripción corta en inglés
```

## Reglas

- Un commit por step completado. No acumular cambios.
- Mensaje en inglés, lowercase, sin punto final.
- Si el step toca BD: NO commitear el SQL — documentarlo en CHANGELOG como `[bd-pending]`.
- Branch de desarrollo: `main` (hasta que se establezca un branch de dev).
- Verificar que `npm run build` pase antes de commitear features nuevos.
