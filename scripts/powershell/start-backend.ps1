# --- Konfiguration ---
$dockerPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
$supabaseFolder = "./supabase"
$functionsEnv = "./supabase/functions/.env"

Write-Host "--- Backend-Initialisierung startet ---" -ForegroundColor Cyan

# 1. Prüfen, ob Docker Desktop läuft
$dockerProcess = Get-Process "Docker Desktop" -ErrorAction SilentlyContinue
if (-not $dockerProcess) {
    Write-Host "[1/6] Docker Desktop wird gestartet..." -ForegroundColor Yellow
    Start-Process $dockerPath
} else {
    Write-Host "[1/6] Docker Desktop läuft bereits." -ForegroundColor Green
}

# 2. Warten, bis die Docker Engine bereit ist (wichtig!)
Write-Host "[2/6] Warte auf Docker Engine..." -ForegroundColor Yellow
while (!(docker info 2>$null)) {
    Start-Sleep -Seconds 2
    Write-Host "." -NoNewline -ForegroundColor Yellow
}
Write-Host "`nDocker Engine ist bereit!" -ForegroundColor Green

# 3. Prüfen, ob Supabase bereits initialisiert ist
if (-not (Test-Path $supabaseFolder)) {
    Write-Host "[3/6] Supabase wird initialisiert..." -ForegroundColor Yellow
    npx supabase init
} else {
    Write-Host "[3/6] Supabase-Ordner bereits vorhanden. Überspringe 'init'." -ForegroundColor Green
}

# 4. Alten Stack stoppen (Fix für 'unhealthy' Container)
Write-Host "[4/6] Bereinige Instanz (Stop)..." -ForegroundColor Yellow
npx supabase stop

# 5. Supabase Stack starten (Datenbank, Auth, Storage)
Write-Host "[5/6] Starte Supabase lokale Instanz..." -ForegroundColor Yellow
npx supabase start

# 6. Edge Functions Server starten
Write-Host "[6/6] Starte Edge Functions Server (Deno)..." -ForegroundColor Yellow
if (Test-Path $functionsEnv) {
    Write-Host "Lade Umgebungsvariablen aus $functionsEnv" -ForegroundColor Gray
    # Startet den Server ohne fehleranfällige Flags. Deno findet die deno.json automatisch.
    npx supabase functions serve --env-file $functionsEnv
} else {
    Write-Host "WARNUNG: Keine .env für Functions gefunden unter $functionsEnv. Starte ohne Secrets." -ForegroundColor Red
    npx supabase functions serve
}

Write-Host "`n--- Setup abgeschlossen! ---" -ForegroundColor Cyan
Write-Host "Studio URL: http://localhost:54323" -ForegroundColor Magenta