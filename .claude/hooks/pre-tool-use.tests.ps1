# Regression tests for pre-tool-use.ps1 guardrails (R1 prohibited-schema writes, R22 auth.users).
# Run: pwsh -NoProfile -File .claude/hooks/pre-tool-use.tests.ps1  (exit 0 = all pass, 1 = a failure)
# Added 2026-06-03 after the foundation audit found two DEAD guardrails that no test caught:
#   (1) "update " (trailing space) keyword -> single-space UPDATE <prohibited>. slipped CHECK 1a.
#   (2) auth.users destructive list had no UPDATE -> mass UPDATE auth.users SET ... slipped CHECK 1b.
# Each guard fix MUST keep a case here so a silent regression is caught by the gate, not by an incident.

$ErrorActionPreference = "Stop"
$hook = Join-Path $PSScriptRoot "pre-tool-use.ps1"
$fail = 0

function Test-Case($desc, $toolName, $payloadInput, $expectBlock) {
    $payload = @{ tool_name = $toolName; tool_input = $payloadInput } | ConvertTo-Json -Compress
    $payload | pwsh -NoProfile -File $hook *> $null
    $blocked = ($LASTEXITCODE -eq 2)
    if ($blocked -eq $expectBlock) {
        Write-Output ("PASS | blocked={0} | {1}" -f $blocked, $desc)
    } else {
        Write-Output ("FAIL | blocked={0} expected={1} | {2}" -f $blocked, $expectBlock, $desc)
        $script:fail = 1
    }
}

function Sql($q) { return @{ query = $q } }
$mcp = 'mcp__claude_ai_Supabase__execute_sql'

# --- R1: prohibited-schema writes (public/payroll/humanos) must block, all verbs, single space ---
Test-Case "R1 single-space UPDATE public" $mcp (Sql "UPDATE public.solicitudes SET status=1 WHERE id=5") $true
Test-Case "R1 single-space UPDATE payroll" $mcp (Sql "update payroll.salaries set s=999 where id=1") $true
Test-Case "R1 single-space UPDATE humanos" $mcp (Sql "update humanos.foo set a=1 where id=1") $true
Test-Case "R1 INSERT INTO public" $mcp (Sql "insert into public.t (a) values (1)") $true
Test-Case "R1 DELETE FROM public" $mcp (Sql "delete from public.t where id=1") $true
Test-Case "R1 CREATE TABLE public" $mcp (Sql "create table public.newt (id int)") $true
Test-Case "R1 DROP SCHEMA public cascade" $mcp (Sql "drop schema public cascade") $true

# --- R22: auth.users destructive ops need WHERE + allowed_apps/id-IN/email filter ---
Test-Case "R22 mass UPDATE auth.users no WHERE" $mcp (Sql "update auth.users set raw_app_meta_data = '{}'") $true
Test-Case "R22 UPDATE auth.users WHERE but no filter" $mcp (Sql "update auth.users set banned_until=now() where true") $true
Test-Case "R22 DELETE auth.users no WHERE" $mcp (Sql "delete from auth.users") $true
Test-Case "R22 UPDATE auth.users properly filtered (allow)" $mcp (Sql "update auth.users set app_metadata='{}' where raw_app_meta_data->'allowed_apps' ? 'movimientOS'") $false

# --- No false positives: allowed-schema writes + reads pass ---
Test-Case "OK UPDATE hr.people WITH where" $mcp (Sql "update hr.people set full_name='x' where id='u'") $false
Test-Case "OK SELECT referencing updated_at column" $mcp (Sql "select id from public.solicitudes where updated_at > now()") $false
Test-Case "OK SELECT from prohibited schema (reads allowed)" $mcp (Sql "select * from public.solicitudes limit 1") $false

if ($fail -eq 0) { Write-Output "ALL PASS"; exit 0 } else { Write-Output "FAILURES PRESENT"; exit 1 }
