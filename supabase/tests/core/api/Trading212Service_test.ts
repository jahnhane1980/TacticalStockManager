// supabase/tests/core/api/Trading212Service_test.ts

import { assertEquals, assertThrows } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import ky from "ky";
import { Trading212Service, Trading212ErrorCodes, Trading212ErrorMessages } from "api/Trading212Service.ts";
import { HttpStatus } from "network/HttpStatus.ts";

/**
 * Hilfsfunktion zum Erstellen eines ky-Mocks.
 * Regel 1: Zero-Any Compliance.
 */
const createMockClient = (status: number, responseData: unknown) => {
  return {
    get: (_url: string, _options: unknown) => {
      if (status === HttpStatus.OK) {
        return Promise.resolve({
          status,
          json: () => Promise.resolve(responseData),
        } as Response);
      } else {
        const response = new Response(JSON.stringify(responseData), { status });
        const error = new Error("HTTP Error");
        error.name = "HTTPError";
        // Sicherer Property-Einschub ohne 'as any'
        Object.defineProperty(error, "response", { value: response });
        return Promise.reject(error);
      }
    },
  } as unknown as typeof ky;
};

const MOCK_KEY = "test-key";
const MOCK_SECRET = "test-secret";
const MOCK_URL = "https://live.trading212.com/api/v0/";

// Test 1: Konstruktor-Validierung (Regel 4 Ausnahmeregelung für Konstruktoren)
Deno.test("Trading212Service - Test 1: Konstruktor validiert Eingaben", () => {
  const mockKy = {} as typeof ky;
  
  assertThrows(() => new Trading212Service("", MOCK_SECRET, MOCK_URL, mockKy), Error, "Trading212Service: API-Key darf nicht leer sein.");
  assertThrows(() => new Trading212Service(MOCK_KEY, "", MOCK_URL, mockKy), Error, "Trading212Service: API-Secret darf nicht leer sein.");
  assertThrows(() => new Trading212Service(MOCK_KEY, MOCK_SECRET, "", mockKy), Error, "BaseApiService: Basis-URL darf nicht leer sein.");
});

// Test 2: Erfolgsfall mit Zod-Coercion (Regel 27)
Deno.test("Trading212Service - Test 2: getPortfolio Erfolgsfall (Financial Precision)", async () => {
  const mockData = [
    {
      instrument: {
        ticker: "COPXl_EQ",
        name: "Copper Miners",
        isin: "IE0003Z9E2Y3",
        currency: "USD"
      },
      createdAt: "2026-04-30T11:52:39.000Z",
      quantity: 15.0, // Als Number geliefert
      quantityAvailableForTrading: "15.0", // Als String geliefert
      quantityInPies: 0,
      currentPrice: 69.17,
      averagePricePaid: 60.98666667,
      walletImpact: {
        currency: "EUR",
        totalCost: 783.72,
        currentValue: 880.27,
        unrealizedProfitLoss: 96.55,
        fxImpact: null // Null-Handling
      }
    }
  ];

  const mockKy = createMockClient(HttpStatus.OK, mockData);
  const service = new Trading212Service(MOCK_KEY, MOCK_SECRET, MOCK_URL, mockKy);

  const result = await service.getPortfolio();

  assertEquals(result.error, null);
  if (result.data) {
    assertEquals(result.data[0].quantity, "15"); // Coerced to string
    assertEquals(result.data[0].currentPrice, "69.17"); // Coerced to string
    assertEquals(result.data[0].walletImpact.fxImpact, "0"); // Null-Handling transformiert zu "0"
  }
});

// Test 3: Validierungsfehler (Regel 14 & 16)
Deno.test("Trading212Service - Test 3: getPortfolio Validierungsfehler (Struktur)", async () => {
  const invalidData = [{ instrument: { ticker: "AAPL" } }]; // Fehlende Felder

  const mockKy = createMockClient(HttpStatus.OK, invalidData);
  const service = new Trading212Service(MOCK_KEY, MOCK_SECRET, MOCK_URL, mockKy);

  const result = await service.getPortfolio();

  assertEquals(result.data, null);
  assertEquals(result.error?.code, Trading212ErrorCodes.VALIDATION_ERROR);
  const expectedMsgPrefix = Trading212ErrorMessages[Trading212ErrorCodes.VALIDATION_ERROR].replace("{}", "");
  assertEquals(result.error?.message.startsWith(expectedMsgPrefix), true);
});

// Test 4: HTTP 401
Deno.test("Trading212Service - Test 4: Fehlerbehandlung 401 (Unauthorized)", async () => {
  const mockKy = createMockClient(HttpStatus.UNAUTHORIZED, { detail: "Invalid" });
  const service = new Trading212Service(MOCK_KEY, MOCK_SECRET, MOCK_URL, mockKy);

  const result = await service.getPortfolio();

  assertEquals(result.data, null);
  assertEquals(result.error?.code, Trading212ErrorCodes.UNAUTHORIZED);
  assertEquals(result.error?.message, Trading212ErrorMessages[Trading212ErrorCodes.UNAUTHORIZED]);
});

// Test 5: HTTP 404
Deno.test("Trading212Service - Test 5: Fehlerbehandlung 404 (Not Found)", async () => {
  const mockKy = createMockClient(HttpStatus.NOT_FOUND, { detail: "Not Found" });
  const service = new Trading212Service(MOCK_KEY, MOCK_SECRET, MOCK_URL, mockKy);

  const result = await service.getPortfolio();

  assertEquals(result.data, null);
  assertEquals(result.error?.code, Trading212ErrorCodes.NOT_FOUND);
  assertEquals(result.error?.message, Trading212ErrorMessages[Trading212ErrorCodes.NOT_FOUND]);
});

// Test 6: HTTP 429
Deno.test("Trading212Service - Test 6: Fehlerbehandlung 429 (Rate Limit)", async () => {
  const mockKy = createMockClient(HttpStatus.TOO_MANY_REQUESTS, { detail: "Rate limit" });
  const service = new Trading212Service(MOCK_KEY, MOCK_SECRET, MOCK_URL, mockKy);

  const result = await service.getPortfolio();

  assertEquals(result.data, null);
  assertEquals(result.error?.code, Trading212ErrorCodes.RATE_LIMIT);
  assertEquals(result.error?.message, Trading212ErrorMessages[Trading212ErrorCodes.RATE_LIMIT]);
});

// Test 7: Interne Fehler (Timeout/Netzwerk)
Deno.test("Trading212Service - Test 7: Unerwartete interne Fehler (Netzwerkabriss)", async () => {
  const mockKy = {
    get: () => { throw new Error("Connection lost"); }
  } as unknown as typeof ky;
  const service = new Trading212Service(MOCK_KEY, MOCK_SECRET, MOCK_URL, mockKy);

  const result = await service.getPortfolio();

  assertEquals(result.data, null);
  assertEquals(result.error?.code, Trading212ErrorCodes.INTERNAL_ERROR);
  assertEquals(result.error?.message, Trading212ErrorMessages[Trading212ErrorCodes.INTERNAL_ERROR].replace("{}", "Connection lost"));
});

