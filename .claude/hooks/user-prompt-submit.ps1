# UserPromptSubmit hook - skill router for HumanOS
# Fires before each user prompt is processed.
# Reads .claude/skill-rules.json and outputs <skill_router> block with matched skills.

$ErrorActionPreference = "Continue"

try {
    $input_raw = [Console]::In.ReadToEnd()
    if (-not $input_raw) { exit 0 }

    $payload = $input_raw | ConvertFrom-Json -ErrorAction Stop
    $userPrompt = ""
    if ($payload.user_prompt) { $userPrompt = $payload.user_prompt.ToString() }
    elseif ($payload.prompt) { $userPrompt = $payload.prompt.ToString() }

    if (-not $userPrompt) { exit 0 }

    $promptLower = $userPrompt.ToLower()

    # Load skill rules
    $rulesPath = Join-Path $PSScriptRoot "..\skill-rules.json"
    if (-not (Test-Path $rulesPath)) { exit 0 }

    $rules = Get-Content $rulesPath -Raw | ConvertFrom-Json
    if (-not $rules.skills) { exit 0 }

    $matched = @()

    foreach ($skill in $rules.skills) {
        $isMatch = $false
        $reason = ""

        # Match by keywords
        if ($skill.keywords) {
            foreach ($kw in $skill.keywords) {
                if ($promptLower.Contains($kw.ToLower())) {
                    $isMatch = $true
                    $reason = "keyword: $kw"
                    break
                }
            }
        }

        # Match by intent_patterns (regex)
        if (-not $isMatch -and $skill.intent_patterns) {
            foreach ($pattern in $skill.intent_patterns) {
                if ($promptLower -match $pattern.ToLower()) {
                    $isMatch = $true
                    $reason = "pattern: $pattern"
                    break
                }
            }
        }

        if ($isMatch) {
            $matched += [PSCustomObject]@{
                Name        = $skill.name
                Description = $skill.description
                Enforcement = $skill.enforcement
                Priority    = $skill.priority
                Reason      = $reason
            }
        }
    }

    if ($matched.Count -eq 0) { exit 0 }

    # Sort by priority (critical > high > medium > low)
    $priorityOrder = @{ "critical" = 1; "high" = 2; "medium" = 3; "low" = 4 }
    $sorted = $matched | Sort-Object { $priorityOrder[$_.Priority.ToString()] }

    # Build output
    $output = @()
    $output += ""
    $output += "<skill_router>"
    $output += "The following skills match keywords/intent in your prompt. CRITICAL and HIGH priority skills should be invoked or referenced when relevant:"
    $output += ""

    foreach ($skill in $sorted) {
        $marker = switch ($skill.Enforcement) {
            "critical" { "[CRITICAL - YOU MUST FOLLOW]" }
            "high"     { "[HIGH PRIORITY]" }
            default    { "[suggested]" }
        }
        $output += "$marker $($skill.Name)"
        if ($skill.Description) {
            $output += "  $($skill.Description)"
        }
        $output += ""
    }

    $output += "</skill_router>"

    $output -join "`n" | Write-Output
    exit 0
}
catch {
    $errPath = Join-Path $PSScriptRoot "errors.log"
    "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] user-prompt-submit error: $($_.Exception.Message)" | Out-File -FilePath $errPath -Append -Encoding utf8NoBOM -ErrorAction SilentlyContinue
    exit 0
}
