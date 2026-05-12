// supabase/functions/tests/core/api/TiingoService_test.ts

import { assertEquals, assertRejects } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import ky from "ky"; // Nutzt jetzt den Alias aus der Map
import { TiingoService } from "api/TiingoService.ts"; // Alias nutzen!
import { HttpStatus } from "network/HttpStatus.ts"; // Alias nutzen!
// Hilfsfunktion zum Erstellen eines ky-Mocks
const createMockClient = (status: number, responseData: any) => {
  return {
    get: (_url: string, _options: any) => {
      if (status === HttpStatus.OK) {
        return Promise.resolve({
          status,
          json: () => Promise.resolve(responseData),
        });
      } else {
        // Simuliert einen ky HTTPError
        const response = new Response(JSON.stringify(responseData), { status });
        const error = new Error("HTTP Error") as any;
        error.name = "HTTPError";
        error.response = response;
        return Promise.reject(error);
      }
    },
  } as unknown as typeof ky;
};

const MOCK_KEY = "test-token-123";
const MOCK_URL = "https://api.tiingo.com/";

Deno.test("TiingoService - Konstruktor validiert Eingaben", () => {
  const mockKy = {} as typeof ky;
  
  assertRejects(async () => new TiingoService("", MOCK_URL, mockKy));
  assertRejects(async () => new TiingoService(MOCK_KEY, "", mockKy));
});

Deno.test("TiingoService.getPrices - Erfolgreicher Abruf", async () => {
  const mockData = [
    { date: "2026-05-08T14:00:00Z", close: 293.57, high: 294.76, low: 292.54, open: 293.92 }
  ];
  
  const mockKy = createMockClient(HttpStatus.OK, mockData);
  const service = new TiingoService(MOCK_KEY, MOCK_URL, mockKy);

  const result = await service.getPrices("AAPL", "1hour");
  
  assertEquals(result.length, 1);
  assertEquals(result[0].close, 293.57);
});

Deno.test("TiingoService.getPrices - Fehlerbehandlung 401 (Unauthorized)", async () => {
  const mockKy = createMockClient(HttpStatus.UNAUTHORIZED, { detail: "Invalid token" });
  const service = new TiingoService(MOCK_KEY, MOCK_URL, mockKy);

  await assertRejects(
    async () => await service.getPrices("AAPL", "1hour"),
    Error,
    "TiingoService: Ungültiger API-Key (401)."
  );
});

Deno.test("TiingoService.getPrices - Fehlerbehandlung 404 (Not Found)", async () => {
  const mockKy = createMockClient(HttpStatus.NOT_FOUND, { detail: "Not found" });
  const service = new TiingoService(MOCK_KEY, MOCK_URL, mockKy);

  await assertRejects(
    async () => await service.getPrices("UNKNOWN", "1hour"),
    Error,
    "TiingoService: Ticker 'UNKNOWN' nicht gefunden (404)."
  );
});

Deno.test("TiingoService.getPrices - Validierung der Parameter", async () => {
  const mockKy = createMockClient(HttpStatus.OK, []);
  const service = new TiingoService(MOCK_KEY, MOCK_URL, mockKy);

  await assertRejects(async () => await service.getPrices("", "1hour"));
  await assertRejects(async () => await service.getPrices("AAPL", " "));
});