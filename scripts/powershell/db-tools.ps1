# --- Supabase Datenbank-Tools ---
Write-Host "--- Supabase Datenbank-Tools ---" -ForegroundColor Cyan
Write-Host "Wähle eine Aktion aus:" -ForegroundColor Yellow
Write-Host "1. Erstelle Migrationsdatei (DB Migration diff)"
Write-Host "2. Erstelle Seed-Datei (Daten-Dump ohne bestimmte Tabellen)"
Write-Host "0. Beenden"

$auswahl = Read-Host "`nBitte Nummer eingeben (0-2)"

switch ($auswahl) {
    "1" {
        Write-Host "`n--- [1] Migrationsdatei erstellen ---" -ForegroundColor Cyan
        $bezeichnung = Read-Host "Bitte gib eine BEZEICHNUNG für die Migration ein (z.B. add_new_table)"
        
        # Prüfung, ob der User wirklich etwas eingegeben hat
        if ([string]::IsNullOrWhiteSpace($bezeichnung)) {
            Write-Host "Fehler: Die Bezeichnung darf nicht leer sein. Abbruch." -ForegroundColor Red
        } else {
            Write-Host "Erstelle Migration '$bezeichnung'..." -ForegroundColor Yellow
            npx supabase db diff --schema public -f $bezeichnung
            Write-Host "Migration erfolgreich erstellt!" -ForegroundColor Green
        }
    }
    "2" {
        Write-Host "`n--- [2] Seed-Datei erstellen ---" -ForegroundColor Cyan
        Write-Host "Führe db dump aus und überschreibe supabase/seed.sql..." -ForegroundColor Yellow
        
        npx supabase db dump --local --data-only -f supabase/seed.sql -x public.market_data_daily -x public.market_data_observation -x public.monitoring_config -x public.portfolio_snapshots
        
        Write-Host "Seed-Datei erfolgreich aktualisiert!" -ForegroundColor Green
    }
    "0" {
        Write-Host "Skript beendet." -ForegroundColor Gray
    }
    default {
        Write-Host "Ungültige Eingabe. Skript beendet." -ForegroundColor Red
    }
}