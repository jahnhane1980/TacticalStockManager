# scripts/powershell/Run-SyncEdgeFunction.ps1

$ENV_PATH = ".env"
$FunctionUrl = "http://127.0.0.1:54321/functions/v1/sync_market_data"

Write-Host "--- [Sync Edge Function Trigger] ---" -ForegroundColor Cyan

# 1. Keys aus .env extrahieren (Regel 1)
if (-not (Test-Path $ENV_PATH)) { 
    Write-Host "❌ Fehler: .env Datei nicht gefunden." -ForegroundColor Red
    exit 1 
}

$envContent = Get-Content $ENV_PATH -Raw
$key = ([regex]::Match($envContent, 'SUPA_BASE_KEY=(.+)')).Groups[1].Value.Trim()

if (-not $key) {
    Write-Host "❌ Fehler: SUPA_BASE_KEY konnte nicht aus .env extrahiert werden." -ForegroundColor Red
    exit 1
}

# 2. Edge Function aufrufen
Write-Host ">>> Rufe Edge Function auf: $FunctionUrl" -ForegroundColor Yellow

try {
    $headers = @{
        "Authorization" = "Bearer $key"
        "Content-Type"  = "application/json"
    }

    Write-Host "Invoke-RestMethod -Uri $FunctionUrl -Method Post -Headers $($headers | ConvertTo-Json) " -ForegroundColor Gray

    $response = Invoke-RestMethod -Uri $FunctionUrl -Method Post -Headers $headers
    
    # 3. Ergebnis ausgeben
    if ($response.success) {
        Write-Host "✅ Stufe 5 erfolgreich: Ticker für Sync geladen und gelockt" -ForegroundColor Green
        Write-Host "   Geprozessst: $($response.processed -join ', ')" -ForegroundColor Gray
        if ($response.errors.Count -gt 0) {
            Write-Host "   Fehler bei: $($response.errors -join '; ')" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Fehler bei der Verarbeitung: $($response.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "💥 Request fehlgeschlagen: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "   Server-Antwort: $errorBody" -ForegroundColor Red
    }
}

Write-Host "--- [Trigger beendet] ---" -ForegroundColor Cyan
