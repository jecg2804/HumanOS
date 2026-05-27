# PreCompact hook - preserve state before auto-compaction
# Fires when /compact is invoked. Writes HANDOFF.json with session state.
#
# Why: when conversation compacts, model loses detail. HANDOFF.json provides
# structured state so next turn can recover quickly.

$ErrorActionPreference = "Continue"

try {
    $input_raw = [Console]::In.ReadToEnd()
    $payload = $null
    if ($input_raw) {
        try { $payload = $input_raw | ConvertFrom-Json -ErrorAction Stop } catch {}
    }

    # Build handoff snapshot
    $handoff = @{
        timestamp = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
        cwd = (Get-Location).Path
        compact_trigger = if ($payload.trigger) { $payload.trigger.ToString() } else { "manual_or_auto" }
    }

    # Git state
    try {
        $branch = (& git rev-parse --abbrev-ref HEAD 2>&1).Trim()
        $lastCommit = (& git log -1 --format="%h %s" 2>&1).Trim()
        $status = (& git status --porcelain 2>&1) -split "`n" | Where-Object { $_ } | Select-Object -First 20

        $handoff.git = @{
            branch = $branch
            last_commit = $lastCommit
            uncommitted_changes = $status
        }
    } catch {
        $handoff.git_error = $_.Exception.Message
    }

    # Recent files modified
    try {
        $recent = Get-ChildItem -Recurse -File -Include *.ts,*.tsx,*.sql,*.md -ErrorAction SilentlyContinue |
            Where-Object { $_.LastWriteTime -gt (Get-Date).AddHours(-2) -and $_.FullName -notmatch 'node_modules|\.next|\.git' } |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 15 -ExpandProperty FullName |
            ForEach-Object { $_ -replace [regex]::Escape((Get-Location).Path + "\"), "" }
        $handoff.recent_files = $recent
    } catch {}

    # Write to Docs/HANDOFF.json (lowercase docs)
    $docsDir = Join-Path (Get-Location).Path "docs"
    if (-not (Test-Path $docsDir)) {
        New-Item -Path $docsDir -ItemType Directory -Force | Out-Null
    }
    $outPath = Join-Path $docsDir "HANDOFF.json"

    $json = $handoff | ConvertTo-Json -Depth 10

    # Write WITHOUT BOM using .NET (PS 5.1 compatible)
    [System.IO.File]::WriteAllText($outPath, $json, [System.Text.UTF8Encoding]::new($false))

    Write-Output ""
    Write-Output "<compact_handoff>"
    Write-Output "Session state preserved to docs/HANDOFF.json before compaction."
    Write-Output "Next turn: read it to recover state."
    Write-Output "</compact_handoff>"

    exit 0
}
catch {
    $errPath = Join-Path $PSScriptRoot "errors.log"
    "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] pre-compact error: $($_.Exception.Message)" | Out-File -FilePath $errPath -Append -Encoding utf8NoBOM -ErrorAction SilentlyContinue
    exit 0
}
