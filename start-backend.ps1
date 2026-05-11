# --- Konfiguration ---
$dockerPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
$supabaseFolder = "./supabase"

Write-Host "--- Backend-Initialisierung startet ---" -ForegroundColor Cyan

# 1. Prüfen, ob Docker Desktop läuft
$dockerProcess = Get-Process "Docker Desktop" -ErrorAction SilentlyContinue
if (-not $dockerProcess) {
    Write-Host "[1/4] Docker Desktop wird gestartet..." -ForegroundColor Yellow
    Start-Process $dockerPath
} else {
    Write-Host "[1/4] Docker Desktop läuft bereits." -ForegroundColor Green
}

# 2. Warten, bis die Docker Engine bereit ist (wichtig!)
Write-Host "[2/4] Warte auf Docker Engine..." -ForegroundColor Yellow
while (!(docker info 2>$null)) {
    Start-Sleep -Seconds 2
    Write-Host "." -NoNewline -ForegroundColor Yellow
}
Write-Host "`nDocker Engine ist bereit!" -ForegroundColor Green

# 3. Prüfen, ob Supabase bereits initialisiert ist
if (-not (Test-Path $supabaseFolder)) {
    Write-Host "[3/4] Supabase wird initialisiert..." -ForegroundColor Yellow
    npx supabase init
} else {
    Write-Host "[3/4] Supabase-Ordner bereits vorhanden. Überspringe 'init'." -ForegroundColor Green
}

# 4. Supabase Stack starten
Write-Host "[4/4] Starte Supabase lokale Instanz..." -ForegroundColor Yellow
npx supabase start

Write-Host "`n--- Setup abgeschlossen! ---" -ForegroundColor Cyan
Write-Host "Studio URL: http://localhost:54323" -ForegroundColor Magenta