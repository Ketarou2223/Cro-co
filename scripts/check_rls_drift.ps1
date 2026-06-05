#Requires -Version 5.1
<#
.SYNOPSIS
    Cro-co RLS drift check script
.DESCRIPTION
    Introspects all public schema tables and compares against rls_allowlist.json.
    Exits 0 (CLEAN) when no violations found, exits 1 when drift is detected.
    Read-only: no DB changes are made.

    Checks performed:
      (i)   DML GRANTs to anon / authenticated / public
      (ii)  Policies not in allowlist (all roles)
      (iii) PERMISSIVE non-service_role policies outside allowlist
      (iv)  SECURITY DEFINER functions with unfixed search_path
      (v)   Tables with RLS disabled
      (+)   Missing required service_role ALL policies (deletion detection)
      (+)   Missing required SECURITY DEFINER functions

.PARAMETER Target
    Target environment: dev | prod

.EXAMPLE
    .\scripts\check_rls_drift.ps1 -Target dev
    .\scripts\check_rls_drift.ps1 -Target prod

.NOTES
    Prerequisites:
      backend/.env must contain:
        dev  -> DEV_DATABASE_URL=<postgres://...>  (or DATABASE_URL as fallback)
        prod -> PROD_DATABASE_URL=<postgres://...>
      Obtain from: Supabase dashboard -> Settings -> Database -> Connection string (URI)

      pg8000 must be installed in backend/.venv:
        backend\.venv\Scripts\pip.exe install pg8000
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("dev", "prod")]
    [string]$Target
)

$ErrorActionPreference = "Stop"

# PS 5.1 はデフォルト出力が UTF-16 LE になるため UTF-8 に固定する（Python JSON 出力の文字化け防止）
$OutputEncoding          = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$scriptDir     = $PSScriptRoot
$allowlistPath = Join-Path $scriptDir "rls_allowlist.json"
$envFile       = Join-Path $scriptDir "..\backend\.env"
$pythonExe     = Join-Path $scriptDir "..\backend\.venv\Scripts\python.exe"
$queryScript   = Join-Path $scriptDir "_rls_query.py"

# ---- .env parser ----
function Read-DotEnv {
    param([string]$Path)
    $vars = @{}
    if (Test-Path $Path) {
        foreach ($line in Get-Content $Path) {
            if ($line -match '^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
                $vars[$Matches[1]] = $Matches[2].Trim()
            }
        }
    }
    return $vars
}

$envVars = Read-DotEnv -Path $envFile

# ---- Resolve DATABASE_URL ----
$dbUrl = $null
if ($Target -eq "dev") {
    if ($envVars.ContainsKey("DEV_DATABASE_URL"))  { $dbUrl = $envVars["DEV_DATABASE_URL"] }
    elseif ($envVars.ContainsKey("DATABASE_URL"))   { $dbUrl = $envVars["DATABASE_URL"] }
} else {
    if ($envVars.ContainsKey("PROD_DATABASE_URL")) { $dbUrl = $envVars["PROD_DATABASE_URL"] }
}

$placeholder = "postgresql://user:password@localhost:5432/croco"
if ((-not $dbUrl) -or ($dbUrl -eq $placeholder) -or ($dbUrl -like "*your-project*")) {
    Write-Host "ERROR: DATABASE_URL not configured for target '$Target'." -ForegroundColor Red
    Write-Host "  dev  -> Add DEV_DATABASE_URL=<postgres://...> to backend/.env"
    Write-Host "  prod -> Add PROD_DATABASE_URL=<postgres://...> to backend/.env"
    Write-Host "  Source: Supabase dashboard -> Settings -> Database -> Connection string (URI)"
    exit 2
}

# ---- Run Python DB introspection ----
# Python 側の stdout/stderr も UTF-8 で出力させる（PS 5.1 環境での文字化け防止）
$env:PYTHONUTF8       = "1"
$env:PYTHONIOENCODING = "utf-8"
$rawLines = & $pythonExe $queryScript $dbUrl 2>&1
$exitCode = $LASTEXITCODE

if ($exitCode -ne 0) {
    Write-Host "ERROR: Query script failed (exit=$exitCode)" -ForegroundColor Red
    $rawLines | ForEach-Object { Write-Host "  $_" }
    exit 2
}

$raw = ($rawLines | Where-Object { $_ -is [string] }) -join ""

try {
    $db = $raw | ConvertFrom-Json
} catch {
    Write-Host "ERROR: Failed to parse query output." -ForegroundColor Red
    Write-Host $raw
    exit 2
}

if ($null -ne $db.error) {
    Write-Host "ERROR: $($db.error)" -ForegroundColor Red
    exit 2
}

# ---- Sanity check: empty result sets are a connection anomaly, not CLEAN ----
# A reachable project always has at least one public table.
$tableCount  = @($db.tables).Count
$policyCount = @($db.policies).Count
if ($tableCount -eq 0) {
    Write-Host "ERROR: DB returned 0 public tables -- connection anomaly or permission denied." -ForegroundColor Red
    Write-Host "  Verify DATABASE_URL and that the role can read pg_tables."
    exit 2
}
if ($policyCount -eq 0) {
    Write-Host "ERROR: DB returned $tableCount table(s) but 0 policies -- connection anomaly (partial read)." -ForegroundColor Red
    Write-Host "  Re-run on a stable connection. This is NOT a DRIFT result."
    exit 2
}

# ---- Load allowlist ----
# -Raw で単一文字列として読む（PS 5.1/7 どちらでも動作する）
# ReadAllText 直接パイプは PS 5.1 で null を返すバグがあるため Get-Content を使用
$allowlist = Get-Content -LiteralPath $allowlistPath -Raw -Encoding UTF8 | ConvertFrom-Json

$devOnlyTables = @()
if ($null -ne $allowlist.known_dev_only_tables) {
    $allowlist.known_dev_only_tables.PSObject.Properties | ForEach-Object {
        if ($_.Name -notlike "_*") { $devOnlyTables += $_.Name }
    }
}

$allowedMap = @{}
foreach ($p in $allowlist.policies) {
    $allowedMap["$($p.table)|$($p.name)"] = $p
}

$violations = [System.Collections.Generic.List[string]]::new()
$timestamp  = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# ---- (v) Tables with RLS disabled ----
foreach ($t in @($db.tables)) {
    if (($Target -eq "prod") -and ($devOnlyTables -contains $t.tablename)) { continue }
    if (-not $t.rls_enabled) {
        $violations.Add("[v] RLS disabled: table '$($t.tablename)'")
    }
}

# ---- (i) DML GRANTs to anon / authenticated / public ----
foreach ($g in @($db.grants)) {
    $violations.Add("[i] Unauthorized GRANT: '$($g.grantee)' has $($g.privilege_type) on $($g.table_name)")
}

# ---- (ii)/(iii) Policies not in allowlist ----
foreach ($p in @($db.policies)) {
    if (($Target -eq "prod") -and ($devOnlyTables -contains $p.tablename)) { continue }

    $key = "$($p.tablename)|$($p.policyname)"
    if (-not $allowedMap.ContainsKey($key)) {
        $roleStr = (@($p.roles) -join ",")
        if ($roleStr -ne "service_role") {
            $violations.Add("[ii/iii] *** Non-allowlist non-service_role policy: '$($p.policyname)' on $($p.tablename) [roles=$roleStr, cmd=$($p.command), permissive=$($p.permissive)]")
        } else {
            $violations.Add("[ii] Non-allowlist service_role policy (update allowlist after new migration): '$($p.policyname)' on $($p.tablename)")
        }
    }
}

# ---- (+) Each table must have at least one service_role ALL policy ----
foreach ($t in @($db.tables)) {
    if (($Target -eq "prod") -and ($devOnlyTables -contains $t.tablename)) { continue }

    $hasSrAll = @($db.policies | Where-Object {
        ($_.tablename -eq $t.tablename) -and
        ((@($_.roles) -contains "service_role")) -and
        ($_.command -eq "ALL")
    })
    if ($hasSrAll.Count -eq 0) {
        $violations.Add("[required] Missing service_role ALL policy (deletion detected): table '$($t.tablename)'")
    }
}

# ---- (iv) SECURITY DEFINER: required functions must exist with fixed search_path ----
foreach ($reqFn in $allowlist.security_definer_functions) {
    $found = @($db.sec_fns | Where-Object { $_.function_name -eq $reqFn.name })
    if ($found.Count -eq 0) {
        $violations.Add("[iv][required] SECURITY DEFINER function missing: '$($reqFn.name)'")
    } else {
        $cfg = @($found[0].config)
        if ($cfg -notcontains $reqFn.required_config) {
            $cfgStr = if ($cfg.Count -gt 0) { $cfg -join "," } else { "(none)" }
            $violations.Add("[iv] SECURITY DEFINER search_path not fixed: '$($reqFn.name)' (config=$cfgStr)")
        }
    }
}

# ---- Report ----
Write-Host ""
if ($violations.Count -eq 0) {
    Write-Host "CLEAN -- No violations detected ($Target / $timestamp)" -ForegroundColor Green
    exit 0
} else {
    Write-Host "DRIFT DETECTED -- $($violations.Count) violation(s) found ($Target / $timestamp)" -ForegroundColor Red
    foreach ($v in $violations) {
        Write-Host "  $v" -ForegroundColor Red
    }
    exit 1
}
