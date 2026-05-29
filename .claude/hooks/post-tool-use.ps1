# PostToolUse hook - auto-validation after Edit/Write
# Fires AFTER tool execution. Outputs to stdout flow back as additional context.
#
# Validates:
# - .ts/.tsx files modified -> run `npx tsc --noEmit` and report (debounced 30s)
# - .sql migrations applied -> remind about COMMENT and RLS checks
#
# Batch 1 audit fix 2026-05-28:
# - tsc check debounced 30s (last-tsc-check.txt timestamp)
# - matcher accepts both mcp__supabase__apply_migration and plugin-namespaced

$ErrorActionPreference = "Continue"

try {
    $input_raw = [Console]::In.ReadToEnd()
    if (-not $input_raw) { exit 0 }

    $payload = $input_raw | ConvertFrom-Json -ErrorAction Stop
    $toolName = $payload.tool_name
    $toolInput = $payload.tool_input

    if (-not $toolName) { exit 0 }

    # TypeScript validation after Edit/Write (debounced 30s)
    if ($toolName -eq "Edit" -or $toolName -eq "Write") {
        $filePath = ""
        if ($toolInput.file_path) { $filePath = $toolInput.file_path.ToString() }

        if ($filePath -match "\.(ts|tsx)$") {
            $debounceFile = Join-Path $PSScriptRoot "last-tsc-check.txt"
            $debounceMs = 30000
            $now = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
            $shouldRun = $true

            if (Test-Path $debounceFile) {
                try {
                    $raw = (Get-Content $debounceFile -Raw -ErrorAction SilentlyContinue)
                    if ($raw) {
                        $lastRun = [int64]($raw.Trim())
                        if (($now - $lastRun) -lt $debounceMs) {
                            $shouldRun = $false
                        }
                    }
                } catch {
                    $shouldRun = $true
                }
            }

            if ($shouldRun) {
                # Stamp BEFORE running so concurrent edits skip
                [System.IO.File]::WriteAllText($debounceFile, $now.ToString(), [System.Text.UTF8Encoding]::new($false))

                $tscOutput = ""
                try {
                    $tscOutput = (& npx tsc --noEmit 2>&1 | Out-String).Trim()
                } catch {
                    $tscOutput = "tsc check failed to run: $($_.Exception.Message)"
                }

                if ($tscOutput -match "error TS") {
                    $errCount = ([regex]::Matches($tscOutput, "error TS")).Count
                    Write-Output ""
                    Write-Output "<typescript_check>"
                    Write-Output "After editing $($filePath -replace '.*[\\/]','')  tsc --noEmit reports $errCount error(s):"
                    Write-Output ""
                    $tscOutput.Split("`n") | Where-Object { $_ -match "error TS" } | Select-Object -First 10 | ForEach-Object {
                        Write-Output "  $_"
                    }
                    Write-Output ""
                    Write-Output "Fix these before continuing."
                    Write-Output "</typescript_check>"
                }
            }
        }
    }

    # SQL migration reminders (always fire, cheap)
    # P2.16 fix: handle both bare and plugin-namespaced apply_migration tool names
    if ($toolName -eq "mcp__supabase__apply_migration" -or $toolName -eq "mcp__plugin_supabase_supabase__apply_migration") {
        Write-Output ""
        Write-Output "<post_migration_reminders>"
        Write-Output "After applying migration, verify:"
        Write-Output "1. RLS habilitada en cada tabla nueva (ALTER TABLE ... ENABLE ROW LEVEL SECURITY)"
        Write-Output "2. COMMENT ON TABLE + COMMENT ON COLUMN poblados"
        Write-Output "3. Golden record: external_ids table + _source column si aplica"
        Write-Output "4. Run the Supabase advisors tool (mcp__plugin_supabase_supabase__get_advisors) to catch policy/security issues"
        Write-Output "</post_migration_reminders>"
    }

    exit 0
}
catch {
    $errPath = Join-Path $PSScriptRoot "errors.log"
    "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] post-tool-use error: $($_.Exception.Message)" | Out-File -FilePath $errPath -Append -Encoding utf8NoBOM -ErrorAction SilentlyContinue
    exit 0
}
