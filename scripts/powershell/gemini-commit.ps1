# gemini-commit.ps1
# Beleg: Searching for 'Powershell pass string to CLI'... [Found in standard PS practices]

# Sorgt fuer korrekte Ausgabe in der Konsole
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "[INFO] Lese Git-Diff aus..." -ForegroundColor White
$diff = git diff HEAD

if ([string]::IsNullOrWhiteSpace($diff)) {
    Write-Host "[WARNUNG] Kein Diff gefunden. Gibt es ungestagete Aenderungen oder ist das Working Directory sauber?" -ForegroundColor Yellow
    exit
}

# 1. Prompt zusammensetzen (WICHTIG: Das "@" am Ende muss GANZ LINKS am Rand stehen)
$prompt = @"
Du bist der Lead Architect für dieser APP. Analysiere den folgenden Git-Diff und erstelle eine professionelle Commit-Message nach den 'Conventional Commits' Standards.
Zwingende Vorgaben:
1. Nimm KEINE Systemänderungen oder Commits vor. Dein Job ist reines Text-Drafting.
2. Erstelle eine 'Summary' (max 50-70 Zeichen) im Format 'Typ(Scope): Kurzbeschreibung' (z.B. refactor(api): implement V14.0 hybrid architecture).
3. Erstelle eine 'Description', die in klaren Bulletpoints das 'Was' und vor allem das 'Warum' (z.B. Eliminierung technischer Schulden, Zero-Any Policy) erklärt.
4. Liefere nur den fertigen Text zurück, bereit zum Kopieren.

Hier ist der Diff seit dem letzten Commit:
$diff
"@

# 2. .gemini.env laden (Scope: Process für saubere Architektur)
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
}

Write-Host "[INFO] Generiere Commit-Message mit Gemini..." -ForegroundColor White

# 3. CLI mit dem String als direktes Argument aufrufen
npx @google/gemini-cli "$prompt"

Write-Host "`n[ERFOLG] Fertig." -ForegroundColor Green