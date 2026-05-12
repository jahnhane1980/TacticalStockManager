# --- Configuration ---
$ENV_PATH = "supabase/functions/.env"
$IMPORT_MAP_PATH = "supabase/functions/import_map.json"
$TEST_SCRIPT_PATH = "scripts/test_api_handshake.ts"

# --- Validation ---
Write-Host "Checking infrastructure..." -ForegroundColor Cyan

if (-not (Test-Path $ENV_PATH)) {
    Write-Error "Environment file not found at: $ENV_PATH"
    exit 1
}

if (-not (Test-Path $IMPORT_MAP_PATH)) {
    Write-Error "Import Map not found at: $IMPORT_MAP_PATH"
    exit 1
}

if (-not (Test-Path $TEST_SCRIPT_PATH)) {
    Write-Error "Test script not found at: $TEST_SCRIPT_PATH"
    exit 1
}

# --- Execution ---
Write-Host "Running Deno API Handshake Test..." -ForegroundColor Yellow
Write-Host "Using Env: $ENV_PATH" -ForegroundColor Gray
Write-Host "Using Map: $IMPORT_MAP_PATH" -ForegroundColor Gray

# Deno command with explicit env and import-map paths
deno run `
    --allow-net `
    --allow-read `
    --env=$ENV_PATH `
    --import-map=$IMPORT_MAP_PATH `
    $TEST_SCRIPT_PATH

if ($LASTEXITCODE -eq 0) {
    Write-Host "Handshake Test Completed." -ForegroundColor Green
} else {
    Write-Host "Handshake Test failed with Exit Code: $LASTEXITCODE" -ForegroundColor Red
}
