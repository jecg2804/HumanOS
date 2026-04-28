## Checks
1. `npm run build` — debe pasar sin errores
2. `npx tsc --noEmit` — TypeScript sin errores
3. Buscar console.log: `grep -rn "console.log" src/ --include="*.ts" --include="*.tsx" -l`
4. Buscar secrets: `grep -rn "sbp_\|sk-\|password.*=.*['\"]" src/ --include="*.ts" --include="*.tsx"`
5. `git status` — reportar archivos sin commit
6. Verificar branch actual

## Output
Reportar: **READY** o **BLOCKED** con razones específicas para cada check que falle.
