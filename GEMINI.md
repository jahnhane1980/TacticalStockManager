# 🛡️ StockMaster Code-Buddy Protokoll (V12.0) - Supabase & Expo Edition

Dieses Dokument ist die oberste Instanz für alle Code-Änderungen. Jede Anweisung der CLI muss gegen dieses Regelwerk validiert werden, um technische Schulden und Logikfehler im Finanz-Kontext zu eliminieren.

---

## 🏛️ Sektion I: Architektur & Modularität (Engine-Adapter-Pattern)

* **Regel 1 (Strict TypeScript & Types):** Kein `any`. Interfaces/Types sind zwingend. Bei API-Schnittstellen müssen `Request`- und `Response`-Typen explizit definiert sein.
* **Regel 2 (Struktur-Vorgabe):**
    * **Frontend (Expo):** UI-Komponenten sind "Pure" (Darstellung). Logik (API-Calls, State-Management) gehört zwingend in **Custom Hooks** (`/hooks`) oder Services.
    * **Backend (Supabase):** Jede Edge Function ist ein autarkes Modul in `supabase/functions/[name]/`. Gemeinsame Kern-Logik liegt zwingend in `supabase/functions/_shared/core/`.
* **Regel 3 (Deno-Import-Policy):** In Edge Functions sind ausschließlich Imports über die `import_map.json` zulässig. Keine relativen Pfade über mehr als zwei Ebenen (`../../`).
* **Regel 4 (Mandatory HTTP-Handling):** Kommunikation erfolgt nur über `supabase/functions/_shared/core/network/HttpStatus.ts`. Jede Response muss ein einheitliches Format nutzen: `{ data: T | null, error: { message: string, code: string } | null }`.

---

## 🎨 Sektion II: Frontend Best-Practices (Expo/React Native)

* **Regel 10 (Style-Integrität):** Keine Inline-Styles in JSX. Verwendung von `StyleSheet.create`. Design-Token (Colors, Spacing) kommen aus einer zentralen Theme-Konfiguration.
* **Regel 11 (Performance):** Große Listen müssen über `FlashList` oder `FlatList` gerendert werden. Schwere Berechnungen innerhalb von Komponenten sind in `useMemo` oder `useCallback` zu kapseln.
* **Regel 12 (Functional Components):** Ausschließlich Functional Components mit Hooks. Keine veralteten Klassen-Komponenten.

---

## 🚫 Sektion III: Zero-Magic & Constants Policy

* **Regel 14 (Absolutes Literal-Verbot):** Funktionale Strings (IDs, Analytics-Events), Schwellenwerte und technische Parameter dürfen nicht hartkodiert werden. Sie müssen in domänenspezifischen Dateien (z. B. `HttpStatus.ts`) verwaltet werden.
* **Regel 15 (HttpStatus-Integrität):** Sollte ein benötigter HTTP-Statuscode in `HttpStatus.ts` fehlen, ist die Erweiterung dieser Datei die **zwingende erste Handlung**, bevor der Code in der Logik verwendet wird.

---

## 🧪 Sektion IV: Qualitätssicherung & Dokumentation

* **Regel 16 (Full-Spectrum-Testing):** Jede Logik-Funktion benötigt ein Test-File (`.test.ts`). Tests müssen positive Pfade, negative Pfade (Error-Handling) und mathematische Grenzfälle (Edge Cases) abdecken.
* **Regel 17 (TSDoc-Standard):** Alle exportierten Klassen und Funktionen müssen einen TSDoc-Block enthalten, der Zweck, Parameter und Rückgabewerte beschreibt.
* **Regel 18 (Database-Integrity):** Änderungen am Schema erfolgen ausschließlich über SQL-Migrations in `supabase/migrations/`. Manuelle DB-Eingriffe sind im Code-Vorschlag untersagt.

---

## 🛠️ Sektion V: CLI-Compliance & Coverage-Mandate

* **Regel 21 (Receipt-Pflicht):** Jede Antwort enthält den Beleg: `Searching for 'X'... [Found in Y / Not found]`.
* **Regel 22 (Atomic Change):** Maximal 3 Dateien gleichzeitig ändern. Bei größeren Aufgaben ist ein Step-by-Step-Fahrplan Pflicht.
* **Regel 23 (Full-Body):** Immer den vollständigen Dateiinhalt liefern. Keine Abkürzungen (`//...`) oder Teil-Code.
* **Regel 24 (Dry-Run-Denken):** Vor der Code-Ausgabe erfolgt die Prüfung: "Verletzt dieser Code das Single-Responsibility-Prinzip?"
* **Regel 25 (100% Coverage Mandate):** Nach jedem Änderungsprozess ist die Testabdeckung zwingend zu prüfen. Ist die Abdeckung < 100%, müssen ohne Aufforderung zusätzliche Tests für alle logischen Zweige und Null-Checks generiert werden.

---

## 💎 Sektion VI: Anti-Technical-Debt & Financial Integrity

* **Regel 26 (Zero-Trust Validation):** Jede externe Datenquelle (API-Response, DB-Payload) muss am System-Eingang gegen ein striktes Schema (z. B. Zod) validiert werden. Unvalidierte Daten erreichen niemals die Service-Layer.
* **Regel 27 (Financial Precision):** Bei Geldwerten oder präzisen Indikatoren ist die Verwendung von `number` (Floats) untersagt. Berechnungen erfolgen via `BigInt` oder spezialisierten Math-Libraries, um Rundungsfehler zu eliminieren.
* **Regel 28 (Idempotency-First):** Funktionen, die den Datenbank-Status verändern, müssen idempotent designt sein (Zweitaufruf darf keine korrupten Daten/Duplikate erzeugen).
* **Regel 29 (Dependency-Sanity):** Neue Third-Party-Libraries werden nur genehmigt, wenn die Logik nicht mit < 50 Zeilen nativem Code (Deno Standard Lib / Hooks) lösbar ist.
* **Regel 30 (Decision-Logs):** Komplexe Architektur-Entscheidungen erhalten einen kurzen Kommentarblock ("ADR - Architecture Decision Record"), der das *Warum* dokumentiert.

---

## 🏁 Sektion VII: Final Compliance Check

* **Regel 31 (The "No-Refactor" Promise):** Die CLI prüft vor Ausgabe: "Würde ich diesen Code in 6 Monaten refactoren wollen?" Wenn ja, wird das Design sofort korrigiert.