# 🛡️ StockMaster Code-Buddy Protokoll (V14.0) - Supabase & Expo Edition

Dieses Dokument ist die oberste Instanz. Jede Anweisung der CLI muss gegen dieses Regelwerk validiert werden. Zuwiderhandlungen gegen Regel 1, 4 und 14 sind kritische Architektur-Verletzungen.

---

## 🏛️ Sektion I: Architektur & Modularität (Engine-Adapter-Pattern)

* **Regel 1 (Strict TypeScript, Zero-Any & No-Casting):** Absolutes `any`-Verbot. Dies verbietet auch Type-Assertions wie `as any` oder `<any>`! Unbekannte Strukturen (wie `catch (error: unknown)`) müssen zwingend über saubere Type-Guards (`typeof`, `instanceof`, `'property' in object`) validiert werden. Das "Blind-Casting" von Third-Party-Errors (z.B. von `ky`) ist untersagt.
* **Regel 2 (Struktur-Vorgabe):** Frontend-Logik in Custom Hooks (`app/src/hooks/`). Backend-Logik in `supabase/functions/_shared/core/`.
* **Regel 3 (Deno-Import-Policy):** In Edge Functions sind ausschließlich Imports über die `import_map.json` zulässig.
* **Regel 4 (No-Throw-Policy & Mandatory Response Format):** APIs und Services dürfen **niemals** Exceptions für zu erwartende Fehler (404, 401, Validierung) werfen (`throw` ist nur bei fatalen Init-Fehlern im Konstruktor erlaubt). Jede Funktion muss ausnahmslos dieses Format zurückgeben: 
  `Promise<{ data: T | null, error: { message: string, code: string } | null }>`

---

## 🎨 Sektion II: Frontend Best-Practices (Expo/React Native)

* **Regel 10 (Style-Integrität):** Keine Inline-Styles in JSX. Verwendung von `StyleSheet.create`. 
* **Regel 11 (Performance):** Listen zwingend über `FlashList` oder `FlatList`. 
* **Regel 12 (Functional Components):** Ausschließlich Functional Components mit Hooks.

---

## 🚫 Sektion III: Zero-Magic & Constants Policy

* **Regel 14 (Absolutes Literal-Verbot & Dictionary-Mandate):** Keine hartkodierten Strings für IDs, Analytics oder Error-Messages in der Logik. 
  * **Zusatz:** Error-Codes UND die dazugehörigen Error-Messages müssen zwingend in einem statischen Mapping-Objekt (z.B. `Record<ErrorCode, string>`) außerhalb der Ausführungslogik definiert werden.
* **Regel 15 (HttpStatus-Integrität):** `HttpStatus.ts` ist die Single Source of Truth für alle Netzwerk-Codes.

---

## 🧪 Sektion IV: Qualitätssicherung & Dokumentation

* **Regel 16 (Full-Spectrum-Testing):** Tests müssen das Objekt-Format aus Regel 4 prüfen (z. B. Assertions auf `result.error.code`).
* **Regel 17 (TSDoc-Standard):** Alle exportierten Klassen und Funktionen benötigen einen TSDoc-Block.
* **Regel 18 (Database-Integrity):** Schema-Änderungen nur via SQL-Migrations in `supabase/migrations/`.

---

## 🛠️ Sektion V: CLI-Compliance & Coverage-Mandate

* **Regel 21 (Receipt-Pflicht):** Jede Antwort enthält den Beleg: `Searching for 'X'... [Found in Y / Not found]`.
* **Regel 22 (Atomic Change):** Maximal 3 Dateien gleichzeitig ändern.
* **Regel 23 (Full-Body):** Immer den vollständigen Dateiinhalt liefern. Keine Abkürzungen (`//...`).
* **Regel 24 (Self-Correction & AST-Scan):** Vor der Code-Ausgabe **muss** die CLI den generierten Code prüfen: Sind `any` oder `as any` vorhanden? Gibt es ein `throw` außerhalb des Konstruktors? Stehen Strings in der Logik? Wenn ja: Verwerfen und neu generieren.
* **Regel 25 (100% Coverage Mandate):** Testabdeckung muss 100% betragen (Logik, Edge-Cases, Null-Checks).

---

## 💎 Sektion VI: Anti-Technical-Debt & Financial Integrity

* **Regel 26 (Zero-Trust Validation & No-Bypass):** Jede externe Datenquelle (auch Legacy-Endpunkte) muss am System-Eingang gegen ein striktes Schema (z. B. Zod) validiert werden. Das direkte Casten von API-Responses (`await res.json() as Type`) ist strengstens verboten.
* **Regel 27 (Financial Precision):** Bei Geldwerten ist die Verwendung von `number` (Floats) untersagt. Berechnungen erfolgen via `BigInt` oder als `string`, um Rundungsfehler zu eliminieren.
* **Regel 28 (Idempotency-First):** Schreibende Datenbank-Operationen müssen idempotent sein.
* **Regel 29 (Dependency-Sanity):** Third-Party-Libraries nur nutzen, wenn natives Deno/TS nicht reicht.
* **Regel 30 (Decision-Logs):** Komplexe Abzweigungen erfordern ein ADR (Architecture Decision Record) im Code.