# PreToolUse hook - deterministic guardrails for HumanOS / ICONSA Database
# Fires BEFORE any tool call executes. Can block by exit 2 + stderr.
#
# Input: JSON via stdin { "tool_name": "...", "tool_input": {...} }
# Output: exit 0 = allow. exit 2 = block (stderr message shown to model).

$ErrorActionPreference = "Continue"

try {
    $input_raw = [Console]::In.ReadToEnd()
    if (-not $input_raw) { exit 0 }

    $payload = $input_raw | ConvertFrom-Json -ErrorAction Stop
    $toolName = $payload.tool_name
    $toolInput = $payload.tool_input

    if (-not $toolName) { exit 0 }

    # ============================================================
    # CHECK 1: Supabase MCP writes
    # ============================================================
    if ($toolName -match "mcp__(plugin_supabase_supabase|supabase)__(apply_migration|execute_sql|deploy_edge_function)") {
        $sql = ""
        if ($toolInput.query) { $sql = $toolInput.query.ToString() }
        if ($toolInput.body) { $sql = $sql + " " + $toolInput.body.ToString() }
        $sqlLower = $sql.ToLower()

        # ----------------------------------------------------------
        # CHECK 1a: Writes to prohibited schemas
        # ----------------------------------------------------------
        $prohibitedSchemas = @("public", "payroll", "humanos")
        $writeKeywords = @(
            "create table",
            "alter table",
            "drop table",
            "create policy",
            "drop policy",
            "alter policy",
            "create function",
            "drop function",
            "create trigger",
            "drop trigger",
            "insert into",
            "update ",
            "delete from",
            "truncate"
        )

        foreach ($schema in $prohibitedSchemas) {
            foreach ($kw in $writeKeywords) {
                $pattern = "$kw\s+(if\s+(not\s+)?exists\s+)?$schema\."
                if ($sqlLower -match $pattern) {
                    $msg = "BLOCKED: Write to prohibited schema '$schema.*' detected.`n"
                    $msg += "Matched pattern: '$kw $schema.'`n"
                    $msg += "Tool: $toolName`n`n"
                    $msg += "Schemas allowed for HumanOS writes:`n"
                    $msg += "  hr, requests, docs, workflows, audit, notifications, files,`n"
                    $msg += "  performance, learning, mdm, etl, backup`n`n"
                    $msg += "Schemas prohibited (NEVER write):`n"
                    $msg += "  public (MovimientOS production)`n"
                    $msg += "  payroll (compania de Jaime)`n"
                    $msg += "  humanos (legacy v1 demo)`n`n"
                    $msg += "Reads (SELECT) from prohibited schemas are allowed.`n"
                    $msg += "See docs/07-SCHEMAS-PERMISOS.md and docs/05-BUSINESS-RULES.md R1.`n"
                    [Console]::Error.WriteLine($msg)
                    exit 2
                }
            }
        }

        # ----------------------------------------------------------
        # CHECK 1b: Destructive ops on auth.users without filter (R22)
        # Incident 2026-05-25: DELETE FROM auth.users without WHERE
        # erased 17 daily MovimientOS users.
        # ----------------------------------------------------------
        $authDestructivePatterns = @(
            "delete\s+from\s+auth\.users",
            "delete\s+from\s+auth\.identities",
            "truncate\s+(table\s+)?auth\.users",
            "truncate\s+(table\s+)?auth\.identities",
            "drop\s+table\s+(if\s+exists\s+)?auth\.users",
            "drop\s+table\s+(if\s+exists\s+)?auth\.identities"
        )

        foreach ($pattern in $authDestructivePatterns) {
            if ($sqlLower -match $pattern) {
                $hasWhere = $sqlLower -match "where\s+"
                $hasProperFilter = $sqlLower -match "(app_metadata|allowed_apps|auth_id\s+in\s*\(|id\s+in\s*\(|email\s*=)"

                if (-not $hasWhere) {
                    $msg = "BLOCKED: Destructive operation on auth.users/auth.identities without WHERE clause.`n"
                    $msg += "Matched: '$pattern'`n"
                    $msg += "Tool: $toolName`n`n"
                    $msg += "This is the exact pattern that caused incident 2026-05-25:`n"
                    $msg += "DELETE FROM auth.users; erased 17 daily MovimientOS users.`n`n"
                    $msg += "Required (R22 in docs/05-BUSINESS-RULES.md):`n"
                    $msg += "1. Snapshot first: CREATE TABLE backup.auth_users_YYYYMMDD AS SELECT * FROM auth.users WHERE <filter>;`n"
                    $msg += "2. SELECT preview shown to human BEFORE destructive op`n"
                    $msg += "3. Explicit filter by app_metadata->'allowed_apps' or id IN (explicit_list)`n"
                    [Console]::Error.WriteLine($msg)
                    exit 2
                }

                if (-not $hasProperFilter) {
                    $msg = "BLOCKED: Destructive op on auth.users has WHERE but no acceptable filter.`n"
                    $msg += "Matched: '$pattern'`n`n"
                    $msg += "R22 requires filter by one of:`n"
                    $msg += "- app_metadata->'allowed_apps' (preferred)`n"
                    $msg += "- auth_id IN (explicit list of UUIDs)`n"
                    $msg += "- id IN (explicit list)`n"
                    $msg += "- email = '...' (single user)`n"
                    [Console]::Error.WriteLine($msg)
                    exit 2
                }
            }
        }

        # ----------------------------------------------------------
        # CHECK 1c: Destructive ops on golden records without WHERE
        # ----------------------------------------------------------
        $goldenRecordTables = @(
            "hr\.people",
            "hr\.employments",
            "hr\.org_units",
            "hr\.positions",
            "requests\.tickets",
            "requests\.types"
        )

        foreach ($table in $goldenRecordTables) {
            $deletePattern = "delete\s+from\s+$table"
            $truncatePattern = "truncate\s+(table\s+)?$table"
            $updatePattern = "update\s+$table\s+set"

            if (($sqlLower -match $deletePattern) -or ($sqlLower -match $truncatePattern)) {
                if (-not ($sqlLower -match "where\s+")) {
                    $tableDisplay = $table -replace "\\", ""
                    $msg = "BLOCKED: Destructive op on golden record '$tableDisplay' without WHERE.`n"
                    $msg += "Tool: $toolName`n`n"
                    $msg += "Required: snapshot + WHERE filter + SELECT preview.`n"
                    [Console]::Error.WriteLine($msg)
                    exit 2
                }
            }

            if ($sqlLower -match $updatePattern) {
                if (-not ($sqlLower -match "where\s+")) {
                    $tableDisplay = $table -replace "\\", ""
                    $msg = "BLOCKED: Mass UPDATE on golden record '$tableDisplay' without WHERE.`n"
                    [Console]::Error.WriteLine($msg)
                    exit 2
                }
            }
        }
    }

    # ============================================================
    # CHECK 2: Bash dangerous commands
    # ============================================================
    if ($toolName -eq "Bash") {
        $cmd = ""
        if ($toolInput.command) { $cmd = $toolInput.command.ToString() }
        $cmdLower = $cmd.ToLower()

        $dangerousPatterns = @{
            "git push --force"   = "Use --force-with-lease instead"
            "git push -f "       = "Use --force-with-lease instead"
            "git reset --hard"   = "Stash changes or create backup branch first"
            "git clean -fd"      = "Review with --dry-run first"
            "rm -rf /"           = "Catastrophic. Never run on root"
            "rm -rf ~"           = "Catastrophic. Never run on home"
            "rm -rf .git"        = "Catastrophic. Would destroy repo history"
        }

        foreach ($pattern in $dangerousPatterns.Keys) {
            if ($cmdLower.Contains($pattern.ToLower())) {
                $reason = $dangerousPatterns[$pattern]
                $msg = "BLOCKED: Dangerous command '$pattern' detected. Reason: $reason"
                [Console]::Error.WriteLine($msg)
                exit 2
            }
        }
    }

    # ============================================================
    # CHECK 3: Edit/Write to .env.local
    # ============================================================
    if ($toolName -eq "Edit" -or $toolName -eq "Write") {
        $filePath = ""
        if ($toolInput.file_path) { $filePath = $toolInput.file_path.ToString() }

        if ($filePath -match "\.env\.local$") {
            $msg = "BLOCKED: Modifying .env.local is not allowed.`n"
            $msg += ".env.local secrets must be managed manually by James and via Vercel Dashboard."
            [Console]::Error.WriteLine($msg)
            exit 2
        }
    }

    exit 0
}
catch {
    $errPath = Join-Path $PSScriptRoot "errors.log"
    "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] pre-tool-use error: $($_.Exception.Message)" | Out-File -FilePath $errPath -Append -Encoding utf8NoBOM -ErrorAction SilentlyContinue
    exit 0
}
