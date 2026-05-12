import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { ResponseAdapter } from "api/ResponseAdapter.ts";

/**
 * ResponseAdapter_test.ts (V14.0)
 * Testet die HTTP-Fehlerbehandlung ohne 'any' (Regel 1 & 15).
 */

const TEST_DICTIONARY = {
  TEST_UNAUTHORIZED: "Authentifizierung fehlgeschlagen.",
  TEST_RATE_LIMIT: "Rate-Limit erreicht.",
  TEST_NOT_FOUND: "Ressource '{}' nicht gefunden.",
  TEST_NETWORK_ERROR: "Netzwerkfehler: {}.",
  TEST_INTERNAL: "Interner Fehler: {}.",
};

const FALLBACK = "TEST_INTERNAL";

/**
 * Hilfs-Klasse um ky-ähnliche HTTP-Fehler zu simulieren ohne 'any'.
 */
class MockHttpError extends Error {
  public response: Response;
  constructor(status: number) {
    super(`HTTP Error ${status}`);
    this.name = "HTTPError";
    this.response = new Response(null, { status });
  }
}

Deno.test("ResponseAdapter - handleHttpError: 401 Unauthorized", () => {
  const adapter = new ResponseAdapter();
  const error = new MockHttpError(401);
  
  const result = adapter.handleHttpError(error, TEST_DICTIONARY, FALLBACK);
  
  assertEquals(result.error.code, "TEST_UNAUTHORIZED");
  assertEquals(result.error.message, TEST_DICTIONARY.TEST_UNAUTHORIZED);
});

Deno.test("ResponseAdapter - handleHttpError: 429 Rate Limit", () => {
  const adapter = new ResponseAdapter();
  const error = new MockHttpError(429);
  
  const result = adapter.handleHttpError(error, TEST_DICTIONARY, FALLBACK);
  
  assertEquals(result.error.code, "TEST_RATE_LIMIT");
  assertEquals(result.error.message, TEST_DICTIONARY.TEST_RATE_LIMIT);
});

Deno.test("ResponseAdapter - handleHttpError: 404 Not Found with resource replacement", () => {
  const adapter = new ResponseAdapter();
  const error = new MockHttpError(404);
  const resource = "AAPL";
  
  const result = adapter.handleHttpError(error, TEST_DICTIONARY, FALLBACK, resource);
  
  assertEquals(result.error.code, "TEST_NOT_FOUND");
  assertEquals(result.error.message, "Ressource 'AAPL' nicht gefunden.");
});

Deno.test("ResponseAdapter - handleHttpError: 500 Generic Network Error", () => {
  const adapter = new ResponseAdapter();
  const error = new MockHttpError(500);
  
  const result = adapter.handleHttpError(error, TEST_DICTIONARY, FALLBACK);
  
  assertEquals(result.error.code, "TEST_NETWORK_ERROR");
  assertEquals(result.error.message, "Netzwerkfehler: 500.");
});

Deno.test("ResponseAdapter - handleHttpError: Non-HTTP Error (Fallback)", () => {
  const adapter = new ResponseAdapter();
  const error = new Error("Custom Error");
  
  const result = adapter.handleHttpError(error, TEST_DICTIONARY, FALLBACK);
  
  assertEquals(result.error.code, FALLBACK);
  assertEquals(result.error.message, "Interner Fehler: Custom Error.");
});

Deno.test("ResponseAdapter - handleHttpError: Unknown Object (Fallback)", () => {
  const adapter = new ResponseAdapter();
  const error = { some: "random stuff" };
  
  const result = adapter.handleHttpError(error, TEST_DICTIONARY, FALLBACK);
  
  assertEquals(result.error.code, FALLBACK);
  assertEquals(result.error.message, "Interner Fehler: Unknown Error.");
});
