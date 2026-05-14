# --- Konfiguration ---
# Zeigt jetzt auf unsere umbenannte Konfigurationsdatei
$configFile = "./supabase/functions/deno.json"
$testFolder = "./supabase/tests"
$coverageDir = "./supabase/tests/coverage"

Write-Host "--- Edge Functions Test-Runner startet ---" -ForegroundColor Cyan

# 1. Validierung
if (-not (Test-Path $configFile)) { Write-Host "[FEHLER] deno.json fehlt" -ForegroundColor Red; exit 1 }
if (-not (Test-Path $testFolder)) { Write-Host "[FEHLER] Test-Ordner fehlt" -ForegroundColor Red; exit 1 }

# Vorbereitung: Alten Stand löschen, um saubere Daten zu haben
if (Test-Path $coverageDir) { Remove-Item -Path $coverageDir -Recurse -Force }

# 2. Test-Ausführung
Write-Host "[RUN] Starte Tests mit Coverage-Aufzeichnung..." -ForegroundColor Yellow
# Flag wurde von --import-map zu --config geändert
deno test --allow-all --config=$configFile --no-check --coverage=$coverageDir $testFolder

$testExitCode = $LASTEXITCODE

# 3. Detaillierte Coverage-Auswertung
if ($testExitCode -eq 0) {
    Write-Host "---------------------------------------------------" -ForegroundColor Gray
    Write-Host "[REPORT] Gesamtübersicht der Abdeckung:" -ForegroundColor Yellow
    
    # 3a. Die Tabelle (wie gehabt)
    deno coverage $coverageDir --exclude=tests
    
    Write-Host "`n[DETAILS] Analyse der ungetesteten Zeilen:" -ForegroundColor Yellow
    Write-Host "---------------------------------------------------" -ForegroundColor Gray
    
    # 3b. Gezielte Abfrage der Dateien, um die 'uncovered lines' zu erzwingen
    # Wir filtern hier auf deine Kern-Ordner (api, models, repository)
    Get-ChildItem -Path "./supabase/functions" -Recurse -Include *.ts | ForEach-Object {
        $relPath = $_.FullName
        # Deno coverage für die Einzeldatei aufrufen, um Details zu sehen
        deno coverage $coverageDir --exclude=tests | Select-String $_.Name -Context 0,1 | Write-Host
    }

    Write-Host "`n[INFO] Der vollständige Report bleibt unter '$coverageDir' erhalten." -ForegroundColor Cyan
    Write-Host "Du kannst jetzt die index.html (falls von deinem Tool erzeugt) dort öffnen." -ForegroundColor Gray
} else {
    Write-Host "---------------------------------------------------" -ForegroundColor Gray
    Write-Host "[FEHLER] Tests fehlgeschlagen." -ForegroundColor Red
}

exit $testExitCode