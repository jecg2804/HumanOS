# HumanOS — Guía de Setup Paso a Paso

## Paso 1: Supabase — Exponer schema humanos

### 1a. Dashboard
1. Abre: https://supabase.com/dashboard/project/bzeoszympkkicwlfdtcn/settings/api
2. Busca "Exposed schemas" (en la sección "Data API Settings")
3. Agrega `humanos` al lado de `public`
4. Click Save
5. Si no ves el campo, busca la URL alternativa: Settings (engranaje) → API → scroll down

### 1b. GRANTs (YA EJECUTADOS por Chat)
Los GRANTs SQL ya fueron ejecutados. No necesitas hacer nada aquí.

---

## Paso 2: GitHub — Crear el repo

1. Abre: https://github.com/organizations/ICONSA-Solutions/repositories/new
   - Si no tienes org, usa: https://github.com/new
2. Repository name: `humanOS` (o `humanos` — como prefieras)
3. Description: "Plataforma de RRHH para ICONSA"
4. Private
5. NO inicializar con README (vamos a hacer push desde local)
6. Click "Create repository"
7. Copia la URL del repo (ej: `https://github.com/ICONSA-Solutions/humanOS.git`)

---

## Paso 3: Local — Clonar y configurar

Abre tu terminal (CMD o PowerShell) y ejecuta:

```bash
# Navega a donde quieres el proyecto (al lado de movimientOS)
cd C:\Users\Jaime Cucalon\projects   # o donde tengas tus repos

# Crea la carpeta y inicializa git
mkdir humanOS
cd humanOS
git init
git remote add origin https://github.com/ICONSA-Solutions/humanOS.git
```

---

## Paso 4: Copiar archivos de configuración

Descarga TODOS los archivos que generé y cópialos al repo. La estructura debe quedar:

```
humanOS/
├── CLAUDE.md
├── humanos-mvp-spec.md
├── humanos-claude-code-prompt.md
├── .claude/
│   ├── commands/
│   │   ├── deploy-check.md
│   │   └── fix-bug.md
│   ├── rules/
│   │   ├── supabase-readonly.md
│   │   ├── commit-after-step.md
│   │   ├── git-workflow.md
│   │   ├── tool-usage.md
│   │   ├── plan-lifecycle.md
│   │   └── spec-lifecycle.md
│   └── skills/
│       └── .gitkeep
├── Docs/
│   ├── TRAIL.md
│   ├── CHANGELOG.md
│   ├── BACKLOG.md
│   ├── feature-specs/
│   │   └── .gitkeep
│   └── superpowers/
│       ├── specs/
│       │   └── .gitkeep
│       └── plans/
│           └── .gitkeep
└── .gitignore (crear manualmente, ver contenido abajo)
```

### .gitignore (crear este archivo):
```
node_modules/
.next/
dist/
build/
.env
.env.local
.env.production.local
*.log
.DS_Store
```

---

## Paso 5: Variables de entorno

Crea el archivo `.env.local` en la raíz del proyecto:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://bzeoszympkkicwlfdtcn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu anon key>
```

Para encontrar tu anon key:
1. Supabase Dashboard → Settings → API
2. Copia "Project API keys" → `anon` `public`

---

## Paso 6: Primer commit

```bash
git add -A
git commit -m "chore: initial project structure with claude code config"
git branch -M main
git push -u origin main
```

---

## Paso 7: Abrir en VS Code

```bash
code .
```

Esto abre VS Code en la carpeta humanOS.

---

## Paso 8: Configurar Claude Code en VS Code

### 8a. Verificar que Claude Code funciona
- En VS Code, abre el panel de Claude Code (Ctrl+Shift+P → "Claude Code")
- Debería reconocer el CLAUDE.md automáticamente

### 8b. Instalar Superpowers
En Claude Code, ejecuta:
```
/plugin marketplace add pcvelz/superpowers-marketplace
/plugin install superpowers@superpowers-marketplace
```

### 8c. Verificar MCPs
Los MCPs que ya tienes instalados a nivel usuario (Playwright, Chrome DevTools, Supabase, Context7) 
deberían funcionar automáticamente porque están en user scope, no project scope.

Verifica con:
```
/mcp
```

Deberías ver: supabase, context7, playwright (mínimo).

### 8d. Configurar Supabase MCP para este proyecto
Si el MCP de Supabase está configurado a nivel de proyecto (.mcp.json), necesitas
crear uno para HumanOS. Si está a nivel usuario ya funciona automáticamente.

---

## Paso 9: Conectar a Vercel

### Opción A: Desde vercel.com
1. Abre: https://vercel.com/new
2. Import Git Repository → selecciona `humanOS`
3. Framework: Next.js
4. Environment Variables: agregar las mismas de .env.local
5. Deploy

### Opción B: Desde terminal (si tienes Vercel CLI)
```bash
npx vercel link
npx vercel env add NEXT_PUBLIC_SUPABASE_URL
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

NOTA: Vercel no se puede conectar hasta que el proyecto Next.js exista.
Primero Claude Code crea el proyecto, después conectas a Vercel.

---

## Paso 10: Darle el prompt a Claude Code

Una vez que tengas:
- ✅ Repo creado y clonado
- ✅ Archivos de configuración copiados
- ✅ .env.local con las keys
- ✅ VS Code abierto en la carpeta
- ✅ Superpowers instalado

Abre Claude Code en VS Code y pega el contenido de `humanos-claude-code-prompt.md`.

Claude Code va a:
1. Leer CLAUDE.md y el spec
2. Invocar brainstorming (Superpowers)
3. Generar un plan
4. Pedirte aprobación
5. Ejecutar el plan (crear Next.js, instalar deps, implementar páginas)
6. Hacer commits incrementales

---

## Troubleshooting

### "Schema humanos not found" o PGRST106
→ No agregaste `humanos` a Exposed schemas en Supabase Dashboard (Paso 1a)

### Claude Code no reconoce CLAUDE.md
→ Asegúrate de que CLAUDE.md está en la RAÍZ del proyecto, no dentro de una subcarpeta

### Supabase MCP no funciona
→ Verifica con `/mcp` en Claude Code. Si no aparece, re-instalar:
```bash
claude mcp add --transport http supabase "https://mcp.supabase.com/mcp?project_ref=bzeoszympkkicwlfdtcn&read_only=true"
```

### Superpowers no se instala
→ Asegúrate de que Claude Code CLI está actualizado: `claude update`
