# scripts/powershell/Run-RepoLiveTest.ps1

$ENV_PATH = ".env"
$IMPORT_MAP_PATH = "supabase/functions/import_map.json"

function Invoke-Supabase { npx.cmd supabase @args }

Write-Host "--- [1/2] Infrastructure Setup ---" -ForegroundColor Cyan
# Docker/Supabase Check & Reset
if (-not (Get-Process "Docker Desktop" -ErrorAction SilentlyContinue)) { 
    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe" 
}
while (!(docker info 2>$null)) { Start-Sleep -Seconds 2 }

Invoke-Supabase db reset
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "--- [2/2] Extracting Keys & Running Tests ---" -ForegroundColor Cyan
if (-not (Test-Path $ENV_PATH)) { Write-Error "ROOT/.env missing"; exit 1 }

# Keys aus .env extrahieren (cite: 13)
$envContent = Get-Content $ENV_PATH -Raw
$url = ([regex]::Match($envContent, 'SUPABASE_URL=(.+)')).Groups[1].Value.Trim()
$key = ([regex]::Match($envContent, 'SUPA_BASE_KEY=(.+)')).Groups[1].Value.Trim()

$env:SUPABASE_URL = $url
$env:SUPABASE_SERVICE_ROLE_KEY = $key

Write-Host ">>> Running Portfolio Live Test..." -ForegroundColor Magenta
deno run --allow-net --allow-read --allow-env --import-map=$IMPORT_MAP_PATH scripts/deno/test_portfolio_live.ts

Write-Host ">>> Running Market Data Live Test..." -ForegroundColor Magenta
deno run --allow-net --allow-read --allow-env --import-map=$IMPORT_MAP_PATH scripts/deno/test_market_data_live.ts

$env:SUPABASE_URL = $null
$env:SUPABASE_SERVICE_ROLE_KEY = $null