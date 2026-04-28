# Prompt para Claude Code — HumanOS MVP

Lee el archivo `humanos-mvp-spec.md` en la raíz del proyecto. Es el spec completo de la app que vamos a crear.

## Contexto
- Este es un proyecto NUEVO — app Next.js separada de MovimientOS
- La base de datos ya existe en Supabase (misma instancia que MovimientOS, project ref: bzeoszympkkicwlfdtcn)
- Schema `humanos` ya tiene: employee_profiles (36 registros), request_types (12 tipos), requests, request_approvals, sequences
- La tabla `public.people` (182 registros) es compartida — NO la modifiques
- La data ya está importada del Excel de Samantha

## Workflow
Usa Superpowers. Empieza con `brainstorming` leyendo el spec, luego `writing-plans`, luego `executing-plans`. El spec tiene todo lo que necesitas: páginas, formularios con campos reales de los SOPs de ICONSA, roles, flujos de aprobación, knowledge base, y el setup de Claude Code (rules, commands, docs structure) que debe replicar de MovimientOS.

## Lo que necesito
1. Setup: crear proyecto Next.js con App Router + TypeScript + Tailwind, configurar Supabase auth
2. Setup de Claude Code: CLAUDE.md, .claude/rules/ (copiar de MovimientOS y adaptar), Docs/ structure
3. Implementar las páginas del spec: login, inicio, perfil, directorio, solicitudes (4 formularios), knowledge base, dashboard admin
4. Mobile-first / PWA ready
5. Todo el UI en español, colores ICONSA (Navy #1B3A5C, Gold #F5A623)

## Nota sobre Supabase
Para queries al schema `humanos`:
```typescript
const humanos = createClient(url, key, { db: { schema: 'humanos' } })
```
Para queries a `public.people`, usar el client normal.

## Resultado esperado
App funcional para demo mañana a la gerente de RRHH. Lo más importante: directorio de empleados funcional + creación de solicitudes + knowledge base. UI limpia, profesional, mobile-first.
