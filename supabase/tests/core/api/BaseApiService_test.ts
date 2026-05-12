import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { z } from "zod";
import ky from "ky";
import { BaseApiService } from "api/BaseApiService.ts";

/**
 * BaseApiService_test.ts (V14.0)
 * Testet die abstrakte Basisklasse mittels eines Test-Implementation.
 */

const TEST_DICT = {
  TEST_VALIDATION_ERROR: "Validierung fehlgeschlagen: {}",
  TEST_HTTP_ERROR: "HTTP Fehler: {}",
  TEST_FALLBACK: "Unbekannter Fehler: {}",
};

const TEST_SCHEMA = z.object({
  id: z.number(),
  name: z.string(),
});

/**
 * Konkrete Implementierung für den Test.
 */
class TestApiService extends BaseApiService {
  constructor(httpClient: typeof ky) {
    super("https://api.test.com", httpClient);
  }

  // Zugriff auf safeRequest ermöglichen
  public async performSafeRequest<T>(
    requestFn: () => Promise<Response>,
    schema: z.ZodSchema<T>
  ) {
    return this.safeRequest(
      requestFn,
      TEST_DICT,
      "TEST_FALLBACK",
      schema
    );
  }
}

Deno.test("BaseApiService - safeRequest: Erfolgreiche Validierung", async () => {
  const mockResponse = new Response(JSON.stringify({ id: 1, name: "Test" }), { status: 200 });
  const mockKy = {
    get: () => Promise.resolve(mockResponse)
  } as unknown as typeof ky;

  const service = new TestApiService(mockKy);
  const result = await service.performSafeRequest(
    () => Promise.resolve(mockResponse),
    TEST_SCHEMA
  );

  assertEquals(result.error, null);
  assertEquals(result.data, { id: 1, name: "Test" });
});

Deno.test("BaseApiService - safeRequest: Zod Validierungsfehler", async () => {
  const mockResponse = new Response(JSON.stringify({ id: "wrong-type", name: "Test" }), { status: 200 });
  const service = new TestApiService(ky);

  const result = await service.performSafeRequest(
    () => Promise.resolve(mockResponse),
    TEST_SCHEMA
  );

  assertEquals(result.data, null);
  assertEquals(result.error?.code, "TEST_VALIDATION_ERROR");
  assertEquals(result.error?.message.includes("Expected number"), true);
});

Deno.test("BaseApiService - safeRequest: Abgefangener HTTP-Fehler via Adapter", async () => {
  class MockHttpError extends Error {
    public name = "HTTPError";
    public response = new Response(null, { status: 404 });
  }

  const service = new TestApiService(ky);
  const result = await service.performSafeRequest(
    () => Promise.reject(new MockHttpError()),
    TEST_SCHEMA
  );

  assertEquals(result.data, null);
  // Der Adapter sucht nach "NOT_FOUND" Suffix im Dictionary.
  // Da unser TEST_DICT das nicht hat, wird FALLBACK genutzt.
  assertEquals(result.error?.code, "TEST_FALLBACK");
});
