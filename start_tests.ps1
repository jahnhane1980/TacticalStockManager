# --- Konfiguration ---
# Die Import-Map liegt korrekt unter functions
$importMap = "./supabase/functions/import_map.json"
# Korrektur: Der Test-Ordner liegt direkt unter supabase/tests
$testFolder = "./supabase/tests"

Write-Host "--- Edge Functions Test-Runner startet ---" -ForegroundColor Cyan

# 1. Validierung der Umgebung
if (-not (Test-Path $importMap)) {
    Write-Host "[FEHLER] import_map.json nicht gefunden unter $importMap" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $testFolder)) {
    Write-Host "[FEHLER] Test-Ordner nicht gefunden unter $testFolder" -ForegroundColor Red
    exit 1
}

# 2. Ausführung der Tests via Deno
Write-Host "[RUN] Starte Deno Unit-Tests..." -ForegroundColor Yellow
Write-Host "---------------------------------------------------" -ForegroundColor Gray

# Wir nutzen --allow-all und verweisen auf die korrekte Import-Map
deno test --allow-all --import-map=$importMap --no-check $testFolder

# 3. Ergebnis-Auswertung
if ($LASTEXITCODE -eq 0) {
    Write-Host "---------------------------------------------------" -ForegroundColor Gray
    Write-Host "[ERFOLG] Alle Tests wurden erfolgreich bestanden!" -ForegroundColor Green
} else {
    Write-Host "---------------------------------------------------" -ForegroundColor Gray
    Write-Host "[FEHLER] Einige Tests sind fehlgeschlagen. Bitte Logs prüfen." -ForegroundColor Red
}

Write-Host "`nTest-Lauf beendet." -ForegroundColor Cyan