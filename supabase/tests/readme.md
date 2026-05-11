#Tests
* Supabase nutzt dafür primär pgTAP
* pgTAP (ein Framework für PostgreSQL-Unit-Tests) 

## Beispiel für einen Test (supabase/tests/database/rls_test.sql):
```sql
BEGIN;
SELECT plan(3); -- Wir erwarten 3 Tests

-- 1. Test: Existiert die Tabelle 'profiles'?
SELECT has_table('profiles');

-- 2. Test: Kann ein nicht eingeloggter User Profile lesen?
-- Wir simulieren einen anonymen User
SET local role anon;
SELECT throws_ok(
    'SELECT * FROM profiles',
    'permission denied',
    'Anonyme User dürfen keine Profile lesen'
);

-- 3. Test: Kann ein User sein eigenes Profil sehen?
-- Wir simulieren einen eingeloggten User
SET local role authenticated;
SET local "request.jwt.claims" = '{"sub": "user-123"}';
-- Hier würde ein INSERT und danach ein SELECT folgen...

SELECT * FROM finish();
ROLLBACK;
//usw.
```
## Ausführen der Tests:
Du startest die Tests einfach über die CLI gegen deine lokale Docker-Instanz:
```prompt 
supabase test db
```
## Notwendige Installationen 
Supabase CLI 
```prompt 
npm install supabase --save-dev
```
[Docker Desktop](https://www.docker.com/products/docker-desktop/)


Wenn du in deinem Projektordner 
```prompt 
supabase start 
```
tippst, lädt Docker alle nötigen Bausteine herunter und startet sie. Du hast dann sogar ein lokales Dashboard (Studio) unter **localhost:54323**, das genauso aussieht wie das online.

## Workflow 
### 1. Initialisierung
```prompt 
npx supabase init
```
### 2. Lokal Starten
```prompt 
npx supabase start
```
### 3. Tests ausführen
```prompt 
npx supabase test db
```

**Anmerkung**
* Docker läuft nur im hintergrund und wird von dem supabase cli benutzt 
* das supabase-cli überschreibt nicht den Ordner sondern fügt nur hinzu 