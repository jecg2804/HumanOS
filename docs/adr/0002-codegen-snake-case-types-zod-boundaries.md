# Supabase codegen + snake_case TS types + Zod only at boundaries

Usamos `mcp__supabase__generate_typescript_types` para regenerar `src/lib/supabase/database.types.ts` despues de cada migration. Codigo consume `Database['hr']['Tables']['people']['Row']` directamente — mantenemos snake_case en TS para evitar drift y conversiones overhead (asi `person.full_name` no `person.fullName`). Conversiones a camelCase solo en props derivadas de UI cuando una libreria lo requiera explicitamente.

Zod schemas se escriben a mano SOLO en boundaries: server action inputs, API routes, form validators. NO se duplica el schema de tablas en Zod — el codegen ya nos da los Row types. Trade-off: codegen requires re-run cuando BD cambia (parte del workflow), pero zero drift TS<->BD y menos boilerplate.

Alternativa rechazada: hand-written types con Zod everywhere como source of truth. Verbose, costoso de mantener, y agrega runtime overhead innecesario para queries internos.
