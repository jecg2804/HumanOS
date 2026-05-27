# PostToolUse hook - auto-validation after Edit/Write
# Fires AFTER tool execution. Outputs to stdout flow back as additional context.
#
# Validates:
# - .ts/.tsx files modified -> run `npx tsc --noEmit` and report status
# - .sql migrations applied -> remind about COMMENT and RLS checks

$ErrorActionPreference = "Continue"

try {
    $input_raw = [Console]::In.ReadToEnd()
    if (-not $input_raw) { exit 0 }

    $payload = $input_raw | ConvertFrom-Json -ErrorAction Stop
    $toolName = $payload.tool_name
    $toolInput = $payload.tool_input

    if (-not $toolName) { exit 0 }

    # TypeScript validation after Edit/Write
    if ($toolName -eq "Edit" -or $toolName -eq "Write") {
        $filePath = ""
        if ($toolInput.file_path) { $filePath = $toolInput.file_path.ToString() }

        if ($filePath -match "\.(ts|tsx)$") {
            # Run tsc --noEmit in background-style check
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

    # SQL migration reminders
    if ($toolName -eq "mcp__supabase__apply_migration") {
        Write-Output ""
        Write-Output "<post_migration_reminders>"
        Write-Output "After applying migration, verify:"
        Write-Output "1. RLS habilitada en cada tabla nueva (ALTER TABLE ... ENABLE ROW LEVEL SECURITY)"
        Write-Output "2. COMMENT ON TABLE + COMMENT ON COLUMN poblados"
        Write-Output "3. Golden record: external_ids table + _source column si aplica"
        Write-Output "4. Run mcp__supabase__get_advisors to catch policy issues"
        Write-Output "</post_migration_reminders>"
    }

    exit 0
}
catch {
    $errPath = Join-Path $PSScriptRoot "errors.log"
    "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] post-tool-use error: $($_.Exception.Message)" | Out-File -FilePath $errPath -Append -Encoding utf8NoBOM -ErrorAction SilentlyContinue
    exit 0
}
