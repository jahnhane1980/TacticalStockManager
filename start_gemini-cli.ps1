# Beleg: Searching for '@google/gemini-cli -i flag usage'... [Found: -i is the official flag for system instructions].

# Sorgt dafür, dass Symbole wie ✅ korrekt angezeigt werden
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# 1. .gemini.env laden (Scope: Process für saubere Architektur)
$envFile = ".gemini.env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -notmatch "^#|^$") {
            $name, $value = $line -split '=', 2
            if ($name -and $value) {
                $cleanValue = $value.Trim().Trim("'").Trim('"')
                [System.Environment]::SetEnvironmentVariable($name.Trim(), $cleanValue, "Process")
            }
        }
    }
    Write-Host "✅ Umgebungsvariablen aus $envFile geladen" -ForegroundColor Cyan
}

# 2. GEMINI.md für den System-Prompt einlesen
$systemPrompt = ""
if (Test-Path "GEMINI.md") {
    $systemPrompt = Get-Content "GEMINI.md" -Raw
    Write-Host "✅ GEMINI.md Regeln aktiv" -ForegroundColor Green
} else {
    Write-Host "⚠️ Keine GEMINI.md gefunden - Standard-Modus" -ForegroundColor Yellow
}

# 3. Interaktive CLI starten
# .geminiignore wird von der CLI beim Datei-Scanning im interaktiven Modus beachtet, 
# muss also nicht explizit übergeben werden, solange wir im Root starten.
Write-Host "🚀 Starte Gemini-CLI..." -ForegroundColor White

if ($systemPrompt -ne "") {
    npx @google/gemini-cli -i "$systemPrompt"
} else {
    npx @google/gemini-cli
}