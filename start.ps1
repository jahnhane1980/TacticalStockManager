# C:\GitHub\TacticalStockManager\scripts\powershell\start.ps1

<#
.SYNOPSIS
    StockMaster CLI Orchestrator - Zentrales Start-Skript für alle PowerShell-Tools.
    
.DESCRIPTION
    Scannt das Verzeichnis ./scripts/powershell und bietet eine interaktive Auswahl.
    Hält sich an das StockMaster-Protokoll (V14.0).
#>

# --- Sektion III: Zero-Magic & Constants Policy (Regel 14) ---
$ERRORS = @{
    FOLDER_NOT_FOUND  = "FEHLER: Der Ordner '{0}' wurde nicht gefunden!"
    NO_SCRIPTS_FOUND  = "WARNUNG: Keine weiteren Skripte im Ordner '{0}' gefunden."
    INVALID_SELECTION = "FEHLER: Ungültige Auswahl. Bitte wählen Sie eine Zahl zwischen 1 und {0}."
    INVALID_INPUT     = "FEHLER: Ungültige Eingabe. Bitte geben Sie eine rein numerische Zahl ein."
}

$LABELS = @{
    HEADER_TEXT      = "StockMaster CLI v1.0"
    LIST_TITLE       = "Verfügbare Skripte im System:"
    INPUT_PROMPT     = "Bitte wählen Sie eine Nummer (1-{0})"
    STARTING_SCRIPT  = "Starte Prozess: {0}..."
    EXIT_MSG         = "Vorgang abgebrochen."
}

$HEADER_ART = @"
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║                $($LABELS.HEADER_TEXT)                 ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
"@

# --- Ausführungslogik ---

# Header-Design (Cyan)
Clear-Host
Write-Host $HEADER_ART -ForegroundColor Cyan
Write-Host ""

# Pfad-Konfiguration (Aktueller Ordner)
$ScriptPath = Join-Path $PSScriptRoot "scripts\powershell"

# Dynamischer Scan der .ps1 Dateien (Exklusive dieses Skripts selbst)
$Files = Get-ChildItem -Path $ScriptPath -Filter *.ps1 | Where-Object { $_.Name -ne $MyInvocation.MyCommand.Name }

if ($Files.Count -eq 0) {
    Write-Host ($ERRORS.NO_SCRIPTS_FOUND -f $ScriptPath) -ForegroundColor Yellow
    return
}

# Ausgabe der Liste (Yellow)
Write-Host $LABELS.LIST_TITLE -ForegroundColor Cyan
for ($i = 0; $i -lt $Files.Count; $i++) {
    Write-Host ("  [$($i + 1)] $($Files[$i].Name)") -ForegroundColor Yellow
}

Write-Host ""
$UserInput = Read-Host ($LABELS.INPUT_PROMPT -f $Files.Count)

# Nutzer-Eingabe Validierung & Ausführung
if ($UserInput -match '^\d+$') {
    $Index = [int]$UserInput - 1
    if ($Index -ge 0 -and $Index -lt $Files.Count) {
        $SelectedScript = $Files[$Index].FullName
        
        Write-Host ""
        Write-Host ($LABELS.STARTING_SCRIPT -f $Files[$Index].Name) -ForegroundColor Cyan
        Write-Host "--------------------------------------------------------------"
        
        # Ausführung
        try {
            & $SelectedScript
        }
        catch {
            Write-Host "FEHLER bei der Ausführung von $($Files[$Index].Name): $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    else {
        Write-Host ($ERRORS.INVALID_SELECTION -f $Files.Count) -ForegroundColor Red
    }
}
else {
    Write-Host $ERRORS.INVALID_INPUT -ForegroundColor Red
}
