# Rule: Git Workflow

## Branches

- `main` — producción (deploy automático a Vercel)
- Feature branches según necesidad: `feat/nombre-del-feature`

## Convenciones

- Commits pequeños y frecuentes (1 step = 1 commit)
- No force push a main
- No commitear .env, .env.local, ni secrets
- No commitear node_modules, .next, dist

## Pre-commit

Antes de cada commit verificar:
1. `npm run build` — sin errores
2. No console.log sueltos en código de producción
3. No secrets hardcodeados
