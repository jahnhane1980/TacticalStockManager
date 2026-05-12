# --- Konfiguration ---
$supabaseFolder = "./supabase"

Write-Host "--- Backend-Shutdown startet ---" -ForegroundColor Cyan

# 1. Supabase Stack stoppen
Write-Host "[1/2] Stoppe Supabase lokale Instanz..." -ForegroundColor Yellow
if (Test-Path $supabaseFolder) {
    # 'npx supabase stop' fährt die Container herunter
    npx supabase stop
    Write-Host "Supabase-Container wurden angehalten." -ForegroundColor Green
} else {
    Write-Host "Supabase-Ordner nicht gefunden. Nichts zu stoppen." -ForegroundColor Red
}

# 2. Docker Desktop beenden
Write-Host "[2/2] Docker Desktop wird beendet..." -ForegroundColor Yellow
$dockerProcess = Get-Process "Docker Desktop" -ErrorAction SilentlyContinue

if ($dockerProcess) {
    # Beendet den Docker Desktop Prozess
    Stop-Process -Name "Docker Desktop" -Force
    Write-Host "Docker Desktop wurde erfolgreich beendet." -ForegroundColor Green
} else {
    Write-Host "Docker Desktop läuft derzeit nicht." -ForegroundColor Green
}

Write-Host "`n--- Backend erfolgreich heruntergefahren! ---" -ForegroundColor Cyan