import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { SupabaseClient, PostgrestError } from "supabase";
import { BaseRepository } from "core/repository/BaseRepository.ts";

/**
 * BaseRepository_test.ts (V14.0)
 * Testet die abstrakte Basisklasse mittels eines Test-Implementation.
 */

const TEST_DB_DICT = {
  "23505": "Eintrag existiert bereits: {}",
  "42P01": "Tabelle nicht gefunden: {}",
  "DB_FALLBACK": "Datenbankfehler: {}",
};

/**
 * Konkrete Implementierung für den Test.
 */
class TestRepository extends BaseRepository {
  public triggerHandleDbError(error: PostgrestError) {
    return this.handleDbError(error, TEST_DB_DICT, "DB_FALLBACK");
  }
}

Deno.test("BaseRepository - handleDbError: Bekannter Fehlercode (23505)", () => {
  const mockSupabase = {} as SupabaseClient;
  const repo = new TestRepository(mockSupabase);
  const mockError: PostgrestError = {
    code: "23505",
    message: "unique_violation",
    details: "",
    hint: "",
  };

  const result = repo.triggerHandleDbError(mockError);

  assertEquals(result.error.code, "23505");
  assertEquals(result.error.message, "Eintrag existiert bereits: unique_violation");
});

Deno.test("BaseRepository - handleDbError: Bekannter Fehlercode (42P01)", () => {
  const mockSupabase = {} as SupabaseClient;
  const repo = new TestRepository(mockSupabase);
  const mockError: PostgrestError = {
    code: "42P01",
    message: "relation does not exist",
    details: "",
    hint: "",
  };

  const result = repo.triggerHandleDbError(mockError);

  assertEquals(result.error.code, "42P01");
  assertEquals(result.error.message, "Tabelle nicht gefunden: relation does not exist");
});

Deno.test("BaseRepository - handleDbError: Unbekannter Fehlercode (Fallback)", () => {
  const mockSupabase = {} as SupabaseClient;
  const repo = new TestRepository(mockSupabase);
  const mockError: PostgrestError = {
    code: "99999",
    message: "some weird error",
    details: "",
    hint: "",
  };

  const result = repo.triggerHandleDbError(mockError);

  assertEquals(result.error.code, "DB_FALLBACK");
  assertEquals(result.error.message, "Datenbankfehler: some weird error");
});
