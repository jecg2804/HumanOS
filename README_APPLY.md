# HumanOS Setup Package — Instrucciones

Pega estos archivos al repo de HumanOS sobreescribiendo lo existente, luego hacer commit y arrancar Code.

## Archivos a copiar al repo

```
CLAUDE.md                                       → REEMPLAZA el actual
humanos-mvp-spec.md                             → REEMPLAZA el actual
.claude/rules/supabase-branch.md                → NUEVO (ver paso 1 abajo)
Docs/CHANGELOG.md                               → REEMPLAZA el actual
Docs/feature-specs/MODULE-1-SOLICITUDES.md      → NUEVO
CLAUDE_CODE_KICKOFF_PROMPT.md                   → NO va al repo, es para pegar a Code (ver paso 3)
```

## Paso 1 — Borrar la regla obsoleta

```bash
rm .claude/rules/supabase-readonly.md
```

(Reemplazada por `supabase-branch.md`).

## Paso 2 — Verificar `.env.local`

Debe tener (ya las pegamos en sesiones anteriores):

```
NEXT_PUBLIC_SUPABASE_URL=https://woonbmfmconldxbeqdnr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
RESEND_API_KEY=...
```

Si alguna falta, copiar del dashboard del branch en `https://supabase.com/dashboard/project/woonbmfmconldxbeqdnr/settings/api`.

## Paso 3 — Arrancar Code

1. `git add -A && git commit -m "Setup HumanOS: branch architecture, MVP spec, Module 1"`
2. `git push`
3. Abrir nueva sesión de Claude Code (en VS Code, en el repo de HumanOS).
4. Pegar el contenido completo de `CLAUDE_CODE_KICKOFF_PROMPT.md` como primer mensaje.
5. Code arranca solo con `/brainstorm` de Superpowers y avanza durante la noche.

## Estado del branch al arrancar Code

- **Project ref**: `woonbmfmconldxbeqdnr`
- **Schema `humanos`**: 5 tablas (`people`, `request_types`, `requests`, `request_approvals`, `sequences`)
- **Datos**: 239 personas, 12 tipos de solicitud
- **Schemas vacíos / no tocar**: `public`, `hr`, `payroll`
- **Producción**: `bzeoszympkkicwlfdtcn` — NO tocar
