#Tests
* Supabase nutzt dafür primär pgTAP
* pgTAP (ein Framework für PostgreSQL-Unit-Tests) 

Beispiel für einen Test (supabase/tests/database/rls_test.sql):
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