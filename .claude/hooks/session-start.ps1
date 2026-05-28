# SessionStart hook - authority framing for HumanOS
# Fires at start of every Claude Code session.
# Output to stdout becomes additional context for the model.

$ErrorActionPreference = "Continue"

try {
    $framing = @"

<EXTREMELY_IMPORTANT>

You are working on HumanOS - internal HR app for ICONSA (construction Panama).
This codebase has hard rules. Read these BEFORE any tool call:

[SCHEMAS PROHIBIDOS - Hook PreToolUse will block writes]
- public.*       (MovimientOS production, owner: dev MovimientOS)
- payroll.*      (compania de Jaime payroll system)
- humanos.*      (legacy v1 demo, archived)

[SCHEMAS TOCABLES - HumanOS canonical]
- hr.*, requests.*, docs.*, workflows.*, audit.*, notifications.*,
  files.*, performance.*, learning.*
- Future MDM/ETL: mdm.*, etl.*, backup.* (when first external integration arrives)

[AUTH.USERS - SHARED across apps - R22 enforced]
auth.users is SHARED between MovimientOS, HumanOS and future apps.
NEVER DELETE/UPDATE auth.users without filter by app_metadata.allowed_apps.
Incident 2026-05-25 documented in docs/05-BUSINESS-RULES.md R22.

[OBLIGATORIO en toda CREATE TABLE]
1. ALTER TABLE ... ENABLE ROW LEVEL SECURITY + min 1 policy
2. COMMENT ON TABLE + COMMENT ON COLUMN
3. If golden record (cross-app entity): {entity}_external_ids + _source column

[HELPER FUNCTIONS - NO redefinir]
- hr.current_person_id(), hr.current_app_role()
- hr.is_hr_admin(), hr.is_president_or_admin()
- hr.is_supervisor_of(uuid), hr.has_direct_reports()
- requests.can_view_ticket(uuid), hr.touch_updated_at()

[IDIOMA UI]
Espanol neutro Panama. NUNCA voseo (vos, tenes, podes, registra-tilde).
SI: tu, tienes, puedes, registra, verifica.

[NO ESTIMAR TIEMPO]
NO days/weeks/months. Solo P1/P2/P3 + trivial/no-trivial/alta-complejidad.

[ENCODING - LESSON 2026-05-25]
- All config files (.json, .ps1, .ts, .tsx, .md, .css): UTF-8 SIN BOM.
- ASCII only in .ps1 hook source (avoid em-dash, accents, special chars).
- Never PowerShell Set-Content / Out-File for config without -Encoding utf8NoBOM.

Read @docs/00-INDEX.md first when in doubt.

</EXTREMELY_IMPORTANT>

"@

    Write-Output $framing
    exit 0
}
catch {
    $errPath = Join-Path $PSScriptRoot "errors.log"
    "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] session-start error: $($_.Exception.Message)" | Out-File -FilePath $errPath -Append -Encoding utf8NoBOM -ErrorAction SilentlyContinue
    exit 0
}
