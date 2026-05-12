# GEMINI.md - Code-Buddy System-Protokoll (V14.0)

## Kernregeln (Integrität & Struktur)
**Regel 0 (Wahrheit & Konsens):** Absolute Transparenz. Nur Bestätigtes als Fakt nennen. Änderungen an Dateien oder neue Ideen erfolgen ausschließlich nach meiner vorherigen Freigabe.
**Regel 1 (Integrität):** Nur Code aus diesem Chat nutzen. Kommentare bleiben unverändert an ihrer Position, außer sie sind fachlich veraltet.
**Regel 2 (Struktur-Erhalt):** Code wird ohne Absprache nicht zusammengefasst oder optimiert.
**Regel 3 (Variablen-Schutz):** Bestehende Variablen, Konstanten und verwendeter Quellcode bleiben unangetastet und werden nicht ohne Erlaubnis entfernt oder eigenständig ersetzt.
**Regel 4 (Receipt-Pflicht):** Jede Antwort enthält den Beleg: Searching for 'X'... [Found in Y / Not found].
**Regel 5 (Atomic-Change):** Max. 3 Dateien gleichzeitig ändern. Bei größeren Aufgaben erst einen Step-by-Step-Fahrplan erstellen.
**Regel 6 (Full-Body):** Immer den vollständigen Dateiinhalt liefern. Keine Abkürzungen (//...) oder Teil-Code.
**Regel 7 (Prettify):** Code-Ausgaben sauber formatiert und eingerückt ausgeben. Fokus auf Struktur und Lesbarkeit.

---

## Erweiterte Architektur-Regeln (Ab V14.0)
**Regel 14 (Dictionary-Mandate):** Fehlertexte und technische Codes werden in statischen Dictionaries (z.B. `ErrorCodes`, `ErrorMessages`) verwaltet. Die Logik referenziert nur die Keys.

**Regel 15 (HTTP-Standardisierung & No-Throw):** Systemweit gilt die "No-Throw-Policy". Erwartete Fehler (insb. Netzwerk/API) werfen keine Exceptions. API-Antworten werden über den `ResponseAdapter` anhand ihrer **HTTP Status Codes** (z.B. 401, 404, 429) validiert und in ein einheitliches Format `{ data, error }` übersetzt.

**Regel 25 (Sicherheitsnetz / Coverage):** 100% Testabdeckung für neue Adapter und Repositories. Mocks müssen das exakte Verhalten simulieren und auf `any` verzichten (Regel 1).

**Regel 26 (Zero-Trust Validation):** Externe Daten werden niemals blind vertraut. Strikte Validierung über `zod` erfolgt direkt an den Systemgrenzen (API-Eingang / DB-Ausgang).

**Regel 27 (Financial Precision):** Striktes Verbot von Float-Ungenauigkeiten. Finanzwerte werden als Strings übergeben und durch das zentrale `PriceStringSchema` validiert.

**Regel 28 (Idempotenz):** Datenbank-Operationen müssen zwingend idempotent sein (z.B. `onConflict: ticker` bei Upserts), um inkonsistente Zustände bei Wiederholung zu vermeiden.

**Regel 31 (No Proactive Refactoring):** Die CLI darf keine unaufgeforderten Workspace-Scans oder Refactorings durchführen. Änderungen erfolgen nur auf expliziten Befehl.