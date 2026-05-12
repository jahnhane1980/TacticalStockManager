# 🛡️ StockMaster Code-Buddy Protokoll (V7.0) - Supabase & Expo Edition

Dieses Dokument ist die oberste Instanz für alle Code-Änderungen. Jede Anweisung der CLI muss gegen dieses Regelwerk validiert werden.

---

## 🏛️ Sektion I: Architektur & Modularität (Engine-Adapter-Pattern)

* **Regel 1 (Strict TypeScript):** Kein `any`. Jede Variable, jeder Funktionsparameter und jeder Rückgabewert muss explizit typisiert sein. Interfaces liegen in `@shared/types` oder lokal im Modul.
* **Regel 2 (Struktur-Vorgabe):**
    * **Frontend (Expo):** Komponenten in `app/src/components/`, Logik in `app/src/hooks/` oder `app/src/services/`.
    * **Backend (Supabase):** Jede Edge Function ist ein autarkes Modul in `supabase/functions/[name]/`. Gemeinsame Logik in `_shared/`.
* **Regel 3 (Single Responsibility):** Ein Modul = Eine Aufgabe. Max. **200 Zeilen** pro Datei. Bei UI-Komponenten Fokus auf "Pure Components" (Darstellung) vs. "Container" (Logik).
* **Regel 4 (Adapter-Prinzip):** Externe APIs (Tiingo, Supabase Auth) werden immer über **Adapter-Klassen** angesprochen. Die Geschäftslogik darf niemals direkt gegen eine externe API-SDK implementiert werden.

---

## 🚫 Sektion II: Zero-Magic & Single Source of Truth

* **Regel 14 (Literal-Verbot):** Alle technischen Parameter, API-Keys (Namen), Schwellenwerte und Pfade müssen aus einer zentralen Konstante (z.B. `AppConstants.ts`) bezogen werden.
* **Regel 15 (Zentrales Messaging):** Fehlermeldungen für den User werden zentral verwaltet. Keine hartkodierten Fehlermeldungen in `throw new Error()` oder `res.json()`.

---

## 🧪 Sektion III: Qualitätssicherung & Dokumentation

* **Regel 16 (Test-Driven-Approach):** Jede neue Logik-Funktion benötigt ein entsprechendes Test-File (`.test.ts`). Für Supabase-Funktionen ist `Deno.test` zu nutzen.
* **Regel 17 (TSDoc-Standard):** Alle exportierten Klassen und Funktionen müssen einen TSDoc-Block enthalten, der Zweck, Parameter und Rückgabewerte beschreibt.
* **Regel 18 (Database-Integrity):** Änderungen am Schema erfolgen ausschließlich über SQL-Migrations in `supabase/migrations/`. Manuelle DB-Eingriffe sind im Code-Vorschlag verboten.

---

## 🌐 Sektion IV: Infrastructure & Secrets

* **Regel 21 (Environments):** Secrets (API_KEYs) gehören in die `.env` (lokal) bzw. in die Supabase Secrets. Die `.gemini.env` dient nur der Steuerung dieser CLI.
* **Regel 22 (RLS-First):** Bei jeder Datenbank-Interaktion muss geprüft werden, ob die Row Level Security (RLS) beachtet wurde. "Service_role"-Keys dürfen nur in begründeten Ausnahmen genutzt werden.

---

## 🛠️ Sektion V: CLI-Protokoll & Compliance (Unverändert)

* **Regel 25 (Receipt-Pflicht):** Jede Antwort enthält den Beleg: `Searching for 'X'... [Found in Y / Not found]`.
* **Regel 26 (Atomic Change):** Maximal 3 Dateien gleichzeitig ändern. Step-by-Step-Fahrplan bei Komplexität.
* **Regel 27 (Full-Body):** Immer den vollständigen Dateiinhalt liefern. Keine Abkürzungen (`//...`).
* **Regel 28 (Prettify):** Code muss sauber formatiert (Prettier-Standard) und eingerückt sein.