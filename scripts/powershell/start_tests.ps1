# --- Konfiguration ---
# Die Import-Map liegt korrekt unter functions
$importMap = "./supabase/functions/import_map.json"
# Korrektur: Der Test-Ordner liegt direkt unter supabase/tests
$testFolder = "./supabase/tests"
# Pfad für die Coverage-Rohdaten
$coverageDir = "./supabase/tests/coverage"

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

# Vorbereitung: Alten Coverage-Ordner entfernen, falls vorhanden
if (Test-Path $coverageDir) {
    Remove-Item -Path $coverageDir -Recurse -Force
}

# 2. Ausführung der Tests via Deno mit Coverage-Flag
Write-Host "[RUN] Starte Deno Unit-Tests mit Coverage..." -ForegroundColor Yellow
Write-Host "---------------------------------------------------" -ForegroundColor Gray

# Wir nutzen --allow-all, verweisen auf die korrekte Import-Map und aktivieren --coverage
deno test --allow-all --import-map=$importMap --no-check --coverage=$coverageDir $testFolder

$testExitCode = $LASTEXITCODE

# 3. Ergebnis-Auswertung und Coverage-Bericht
if ($testExitCode -eq 0) {
    Write-Host "---------------------------------------------------" -ForegroundColor Gray
    Write-Host "[ERFOLG] Alle Tests wurden erfolgreich bestanden!" -ForegroundColor Green
    
    Write-Host "`n[REPORT] Erstelle Coverage-Bericht..." -ForegroundColor Yellow
    # Deno wertet die Daten im coverageDir aus und zeigt die Prozentzahlen sowie Lücken an
    deno coverage $coverageDir
} else {
    Write-Host "---------------------------------------------------" -ForegroundColor Gray
    Write-Host "[FEHLER] Einige Tests sind fehlgeschlagen. Coverage-Bericht wird übersprungen." -ForegroundColor Red
}

# Bereinigung: Coverage-Rohdaten nach der Auswertung entfernen
if (Test-Path $coverageDir) {
    Remove-Item -Path $coverageDir -Recurse -Force
}

Write-Host "`nTest-Lauf beendet." -ForegroundColor Cyan
exit $testExitCode