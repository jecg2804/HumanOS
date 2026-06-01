# Stop hook - advisory verify reminder for HumanOS
# Fires when the main agent finishes a response.
# Advisory only (exit 0 + stdout). Never blocks.
#
# Purpose (audit H3): when tracked code files (.ts/.tsx/.sql/.css) are left
# uncommitted, remind to run `npm run verify` before treating work as done.
# Debounced to once per 10 min via last-stop-reminder.txt so it is not noisy.
#
# Encoding: ASCII only (R23). No accents, no em-dash, no smart quotes.

$ErrorActionPreference = "Continue"

try {
    $input_raw = [Console]::In.ReadToEnd()
    if ($input_raw) {
        try {
            $payload = $input_raw | ConvertFrom-Json -ErrorAction Stop
            # Avoid loops: if we are already inside a stop-hook continuation, do nothing.
            if ($payload.stop_hook_active -eq $true) { exit 0 }
        } catch { }
    }

    # Find uncommitted changes to tracked code files (working tree + staged).
    $changed = @()
    try {
        $changed += (& git diff --name-only 2>$null)
        $changed += (& git diff --cached --name-only 2>$null)
    } catch { exit 0 }

    $code = $changed | Where-Object { $_ -match "\.(ts|tsx|sql|css)$" } | Sort-Object -Unique
    if (-not $code -or $code.Count -eq 0) { exit 0 }

    # Debounce: only remind once per 10 minutes.
    $debounceFile = Join-Path $PSScriptRoot "last-stop-reminder.txt"
    $debounceMs = 600000
    $now = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
    if (Test-Path $debounceFile) {
        try {
            $raw = (Get-Content $debounceFile -Raw -ErrorAction SilentlyContinue)
            if ($raw) {
                $last = [int64]($raw.Trim())
                if (($now - $last) -lt $debounceMs) { exit 0 }
            }
        } catch { }
    }
    [System.IO.File]::WriteAllText($debounceFile, $now.ToString(), [System.Text.UTF8Encoding]::new($false))

    $hasSql = ($code | Where-Object { $_ -match "\.sql$" }).Count -gt 0
    Write-Output ""
    Write-Output "<verify_reminder>"
    Write-Output "Uncommitted code changes in $($code.Count) tracked file(s)."
    if ($hasSql) {
        Write-Output "Includes .sql: confirm RLS + COMMENT + advisors before treating the migration as done."
    }
    Write-Output "Before marking this work complete, run: npm run verify"
    Write-Output "(or at minimum: npm run typecheck + npm run lint). CI enforces this on push."
    Write-Output "</verify_reminder>"
    exit 0
}
catch {
    $errPath = Join-Path $PSScriptRoot "errors.log"
    "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] stop hook error: $($_.Exception.Message)" | Out-File -FilePath $errPath -Append -Encoding utf8NoBOM -ErrorAction SilentlyContinue
    exit 0
}
