# ============================================================
# CLAUDE CODE AUDIT COMPREHENSIVE
# Verifica estado real de: marketplaces, plugins, MCPs, hooks,
# skills, agents, CLIs, project files. Solo lectura - no modifica.
# ============================================================

$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"

function H1 { param($t) Write-Host "`n========================================" -ForegroundColor Cyan; Write-Host " $t" -ForegroundColor Cyan; Write-Host "========================================" -ForegroundColor Cyan }
function H2 { param($t) Write-Host "`n--- $t ---" -ForegroundColor Yellow }
function OK { param($t) Write-Host "  [OK] $t" -ForegroundColor Green }
function NO { param($t) Write-Host "  [--] $t" -ForegroundColor Red }
function INFO { param($t) Write-Host "  $t" }

$repo = "C:\Users\Jaime Cucalon\Documents\iconsa_apps\HumanOS"

# ============================================================
H1 "1. CLAUDE CODE CLI"
# ============================================================
$claudeVer = (claude --version 2>&1 | Out-String).Trim()
INFO "Version: $claudeVer"

# ============================================================
H1 "2. CONFIG FILES USER-LEVEL"
# ============================================================

H2 "~/.claude.json (mcpServers manuales, enabledMcpjsonServers)"
$ucj = "$HOME\.claude.json"
if (Test-Path $ucj) {
    try {
        $j = Get-Content $ucj -Raw | ConvertFrom-Json
        $sz = (Get-Item $ucj).Length
        OK "Existe ($sz bytes, JSON valido)"
        if ($j.mcpServers) {
            $servers = $j.mcpServers.PSObject.Properties
            INFO "  mcpServers configurados: $($servers.Count)"
            $servers | ForEach-Object { INFO "    - $($_.Name)" }
        } else { NO "  Sin mcpServers" }
    } catch { NO "JSON invalido: $($_.Exception.Message)" }
} else { NO "No existe" }

H2 "~/.claude/settings.json (enabledPlugins)"
$ucs = "$HOME\.claude\settings.json"
if (Test-Path $ucs) {
    try {
        $s = Get-Content $ucs -Raw | ConvertFrom-Json
        $sz = (Get-Item $ucs).Length
        OK "Existe ($sz bytes, JSON valido)"
        if ($s.enabledPlugins) {
            $enabled = $s.enabledPlugins.PSObject.Properties | Where-Object Value -eq $true
            INFO "  enabledPlugins: $($enabled.Count)"
            $enabled | Select-Object -First 5 | ForEach-Object { INFO "    - $($_.Name)" }
            if ($enabled.Count -gt 5) { INFO "    ... y $($enabled.Count - 5) mas" }
        } else { NO "  Sin enabledPlugins" }
    } catch { NO "JSON invalido: $($_.Exception.Message)" }
} else { NO "No existe (este es el archivo que se borro)" }

H2 "BOM check en archivos config"
@($ucj, $ucs) | ForEach-Object {
    if (Test-Path $_) {
        $bytes = [System.IO.File]::ReadAllBytes($_) | Select-Object -First 3
        $hasBOM = ($bytes.Count -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)
        $name = ($_ -split '\\')[-1]
        if ($hasBOM) { NO "$name TIENE BOM (problematico)" } else { OK "$name sin BOM" }
    }
}

# ============================================================
H1 "3. MARKETPLACES"
# ============================================================
$mp = claude plugin marketplace list 2>&1 | Out-String
INFO $mp

# ============================================================
H1 "4. PLUGINS DATA FOLDER"
# ============================================================
$pdData = "$HOME\.claude\plugins\data"
if (Test-Path $pdData) {
    $plugins = Get-ChildItem $pdData -Directory
    OK "$pdData existe con $($plugins.Count) plugin dirs"
    $plugins | ForEach-Object { INFO "    - $($_.Name)" }
} else { NO "$pdData no existe" }

# ============================================================
H1 "5. CLI TOOLS EXTERNOS"
# ============================================================
$clis = @(
    @{ name = "git"; cmd = "git --version" },
    @{ name = "gh (GitHub CLI)"; cmd = "gh --version" },
    @{ name = "node"; cmd = "node --version" },
    @{ name = "npm"; cmd = "npm --version" },
    @{ name = "vercel"; cmd = "vercel --version" },
    @{ name = "supabase"; cmd = "supabase --version" },
    @{ name = "gemini"; cmd = "gemini --version" }
)

foreach ($cli in $clis) {
    try {
        $output = Invoke-Expression $cli.cmd 2>&1 | Out-String
        if ($LASTEXITCODE -eq 0) {
            OK "$($cli.name): $($output.Trim().Split([Environment]::NewLine)[0])"
        } else {
            NO "$($cli.name): no instalado"
        }
    } catch { NO "$($cli.name): no instalado" }
}

# ============================================================
H1 "6. PROJECT REPO STATE"
# ============================================================
Set-Location $repo

H2 "Project files raiz"
@("CLAUDE.md", "PROJECT_CONSTITUTION.md", "package.json", "tsconfig.json", "next.config.ts", "repomix.config.json", "src/app/globals.css") | ForEach-Object {
    if (Test-Path $_) {
        $sz = (Get-Item $_).Length
        OK "$_ ($sz bytes)"
    } else { NO "$_ falta" }
}

H2 "Project docs (14 esperados)"
$docs = Get-ChildItem "docs/*.md" -ErrorAction SilentlyContinue | Where-Object { $_.Name -match "^\d{2}-" }
INFO "Total numerados: $($docs.Count)"
$docs | ForEach-Object { INFO "    - $($_.Name)" }

H2 ".claude/ del proyecto"
if (Test-Path .claude) {
    Get-ChildItem .claude -Recurse | ForEach-Object {
        $rel = $_.FullName.Replace((Get-Location).Path + "\", "")
        if ($_.PSIsContainer) {
            Write-Host "  [DIR] $rel" -ForegroundColor Yellow
        } else {
            $sz = $_.Length
            # BOM check para .json y .ps1
            $hasBOM = $false
            if ($_.Extension -in @(".json", ".ps1")) {
                $bytes = [System.IO.File]::ReadAllBytes($_.FullName) | Select-Object -First 3
                $hasBOM = ($bytes.Count -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)
            }
            $bomTag = if ($hasBOM) { " [BOM!]" } else { "" }
            Write-Host "        $rel ($sz bytes)$bomTag"
        }
    }
} else { NO ".claude/ no existe" }

H2 ".claude.QUARANTINE-*"
Get-ChildItem .claude.QUARANTINE-* -Directory -ErrorAction SilentlyContinue | ForEach-Object {
    INFO "  $($_.Name) (preservado)"
}

# ============================================================
H1 "7. SKILLS EN PROJECT"
# ============================================================
H2 ".claude/skills/ del proyecto"
if (Test-Path ".claude/skills") {
    Get-ChildItem ".claude/skills" -Directory | ForEach-Object {
        $skillMd = Join-Path $_.FullName "SKILL.md"
        if (Test-Path $skillMd) {
            $sz = (Get-Item $skillMd).Length
            OK "$($_.Name) (SKILL.md: $sz bytes)"
        } else {
            NO "$($_.Name) sin SKILL.md"
        }
    }
} else {
    NO ".claude/skills/ no existe (los matt-pocock se perdieron?)"
}

H2 ".agents/ (legacy matt-pocock location)"
if (Test-Path ".agents") {
    INFO "Existe .agents/ - James menciono que borro"
} else {
    OK ".agents/ borrado (correcto, movido a .claude/skills/)"
}

# ============================================================
H1 "8. RESUMEN EJECUTIVO"
# ============================================================
INFO ""
INFO "Estado de Claude Code system:"
INFO "- Marketplaces:        ver Seccion 3"
INFO "- Plugins instalados:  ver Seccion 4"
INFO "- Plugins habilitados: ver Seccion 2 (enabledPlugins)"
INFO "- MCPs manuales:       ver Seccion 2 (mcpServers)"
INFO ""
INFO "Estado del proyecto:"
INFO "- Project files: ver Seccion 6"
INFO "- Hooks repo:    ver Seccion 6 (.claude/hooks)"
INFO "- Skills repo:   ver Seccion 7"
INFO ""
INFO "ACCION REQUERIDA:"
INFO "Si Seccion 3 dice 'No marketplaces configured' o Seccion 4 falta,"
INFO "ejecuta el script de reinstall (marketplaces + 19 plugins)."
