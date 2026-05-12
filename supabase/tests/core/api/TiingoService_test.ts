// supabase/tests/core/api/TiingoService_test.ts

import { assertEquals, assertThrows } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import ky from "ky";
import { TiingoService, TiingoErrorCodes, TiingoErrorMessages } from "api/TiingoService.ts";
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
        // Simuliert einen ky HTTPError ohne 'as any'
        const response = new Response(JSON.stringify(responseData), { status });
        const error = new Error("HTTP Error");
        error.name = "HTTPError";
        // Wir fügen die Property 'response' sicher hinzu
        Object.defineProperty(error, "response", { value: response });
        return Promise.reject(error);
      }
    },
  } as unknown as typeof ky;
};

const MOCK_KEY = "test-token-123";
const MOCK_URL = "https://api.tiingo.com/";

Deno.test("TiingoService - Konstruktor validiert Eingaben (Init-Fehler werfen)", () => {
  const mockKy = {} as typeof ky;
  
  assertThrows(() => new TiingoService("", MOCK_URL, mockKy), Error, "TiingoService: API-Key darf nicht leer sein.");
  assertThrows(() => new TiingoService(MOCK_KEY, "", mockKy), Error, "TiingoService: Basis-URL darf nicht leer sein.");
});

Deno.test("TiingoService.getHistoricalData - Erfolgreicher Abruf (Regel 4 & 26 & 27)", async () => {
  const mockData = [
    {
      date: "2024-05-13T00:00:00.000Z",
      close: 186.28,
      high: 187.1,
      low: 184.62,
      open: 185.435,
      volume: 72044809,
      adjClose: 184.8632698598,
      adjHigh: 185.6770334484,
      adjLow: 183.2158947902,
      adjOpen: 184.0246964057,
      adjVolume: 72044809,
      divCash: 0.0,
      splitFactor: 1.0
    }
  ];

  const mockKy = createMockClient(HttpStatus.OK, mockData);
  const service = new TiingoService(MOCK_KEY, MOCK_URL, mockKy);

  const result = await service.getHistoricalData("AAPL", "2024-05-13");

  assertEquals(result.error, null);
  assertEquals(result.data?.length, 1);
  if (result.data) {
    assertEquals(result.data[0].close, "186.28"); // Als String validiert (Regel 27)
    assertEquals(result.data[0].volume, 72044809);
    assertEquals(result.data[0].adjClose, "184.8632698598");
  }
});

Deno.test("TiingoService.getHistoricalData - Fehlerbehandlung bei Validierungsfehler", async () => {
  const invalidData = [{ date: "2024-05-13", close: "invalid" }]; // Fehlende Pflichtfelder

  const mockKy = createMockClient(HttpStatus.OK, invalidData);
  const service = new TiingoService(MOCK_KEY, MOCK_URL, mockKy);

  const result = await service.getHistoricalData("AAPL", "2024-05-13");

  assertEquals(result.data, null);
  assertEquals(result.error?.code, TiingoErrorCodes.VALIDATION_ERROR);
  // Validierung der exakten Fehlermeldung aus dem Mapping (Regel 14 & 16)
  const expectedMsg = TiingoErrorMessages[TiingoErrorCodes.VALIDATION_ERROR].replace("{}", "");
  assertEquals(result.error?.message.startsWith(expectedMsg), true);
});

Deno.test("TiingoService.getHistoricalData - Validierung der Parameter", async () => {
  const mockKy = createMockClient(HttpStatus.OK, []);
  const service = new TiingoService(MOCK_KEY, MOCK_URL, mockKy);

  // Ticker leer
  const result1 = await service.getHistoricalData("", "2024-05-13");
  assertEquals(result1.error?.code, TiingoErrorCodes.VALIDATION_ERROR);
  assertEquals(result1.error?.message, TiingoErrorMessages[TiingoErrorCodes.VALIDATION_ERROR].replace("{}", "Ticker ungültig"));

  // Falsches Datumsformat
  const result2 = await service.getHistoricalData("AAPL", "13-05-2024");
  assertEquals(result2.error?.code, TiingoErrorCodes.VALIDATION_ERROR);
  assertEquals(result2.error?.message, TiingoErrorMessages[TiingoErrorCodes.VALIDATION_ERROR].replace("{}", "Format YYYY-MM-DD erforderlich"));
});

Deno.test("TiingoService.getHistoricalData - Fehlerbehandlung 401 (Unauthorized)", async () => {
  const mockKy = createMockClient(HttpStatus.UNAUTHORIZED, { detail: "Invalid token" });
  const service = new TiingoService(MOCK_KEY, MOCK_URL, mockKy);

  const result = await service.getHistoricalData("AAPL", "2024-05-13");

  assertEquals(result.data, null);
  assertEquals(result.error?.code, TiingoErrorCodes.UNAUTHORIZED);
  assertEquals(result.error?.message, TiingoErrorMessages[TiingoErrorCodes.UNAUTHORIZED]);
});

Deno.test("TiingoService.getHistoricalData - Fehlerbehandlung 404 (Not Found)", async () => {
  const mockKy = createMockClient(HttpStatus.NOT_FOUND, { detail: "Not found" });
  const service = new TiingoService(MOCK_KEY, MOCK_URL, mockKy);

  const result = await service.getHistoricalData("UNKNOWN", "2024-05-13");

  assertEquals(result.data, null);
  assertEquals(result.error?.code, TiingoErrorCodes.NOT_FOUND);
  assertEquals(result.error?.message, TiingoErrorMessages[TiingoErrorCodes.NOT_FOUND].replace("{}", "unknown"));
});

Deno.test("TiingoService.getHistoricalData - Fehlerbehandlung 429 (Too Many Requests)", async () => {
  const mockKy = createMockClient(HttpStatus.TOO_MANY_REQUESTS, { detail: "Rate limit" });
  const service = new TiingoService(MOCK_KEY, MOCK_URL, mockKy);

  const result = await service.getHistoricalData("AAPL", "2024-05-13");

  assertEquals(result.data, null);
  assertEquals(result.error?.code, TiingoErrorCodes.RATE_LIMIT);
  assertEquals(result.error?.message, TiingoErrorMessages[TiingoErrorCodes.RATE_LIMIT]);
});

Deno.test("TiingoService.getHistoricalData - Unerwarteter Statuscode (Default-Case)", async () => {
  const mockKy = createMockClient(HttpStatus.FORBIDDEN, { detail: "Forbidden" });
  const service = new TiingoService(MOCK_KEY, MOCK_URL, mockKy);

  const result = await service.getHistoricalData("AAPL", "2024-05-13");

  assertEquals(result.data, null);
  assertEquals(result.error?.code, TiingoErrorCodes.NETWORK_ERROR);
  assertEquals(result.error?.message, TiingoErrorMessages[TiingoErrorCodes.NETWORK_ERROR].replace("{}", "403"));
});

Deno.test("TiingoService.getHistoricalData - Interner Fehler (unbekannter Error)", async () => {
  const mockKy = {
    get: () => { throw new Error("Netzwerk-Timeout"); }
  } as unknown as typeof ky;
  const service = new TiingoService(MOCK_KEY, MOCK_URL, mockKy);

  const result = await service.getHistoricalData("AAPL", "2024-05-13");

  assertEquals(result.data, null);
  assertEquals(result.error?.code, TiingoErrorCodes.INTERNAL_ERROR);
  assertEquals(result.error?.message, TiingoErrorMessages[TiingoErrorCodes.INTERNAL_ERROR].replace("{}", "Netzwerk-Timeout"));
});

Deno.test("TiingoService.getHistoricalData - Interner Fehler (non-Error Objekt)", async () => {
  const mockKy = {
    get: () => { throw "Fataler Fehler"; }
  } as unknown as typeof ky;
  const service = new TiingoService(MOCK_KEY, MOCK_URL, mockKy);

  const result = await service.getHistoricalData("AAPL", "2024-05-13");

  assertEquals(result.data, null);
  assertEquals(result.error?.code, TiingoErrorCodes.INTERNAL_ERROR);
  assertEquals(result.error?.message, TiingoErrorMessages[TiingoErrorCodes.INTERNAL_ERROR].replace("{}", "Unknown Error"));
});

Deno.test("TiingoService.getDaily - Erfolgreicher Abruf", async () => {
  const mockData = [
    {
      date: "2024-05-13T00:00:00.000Z",
      close: 186.28,
      high: 187.1,
      low: 184.62,
      open: 185.435,
      volume: 72044809,
      adjClose: 184.8632698598,
      adjHigh: 185.6770334484,
      adjLow: 183.2158947902,
      adjOpen: 184.0246964057,
      adjVolume: 72044809,
      divCash: 0.0,
      splitFactor: 1.0
    }
  ];

  const mockKy = createMockClient(HttpStatus.OK, mockData);
  const service = new TiingoService(MOCK_KEY, MOCK_URL, mockKy);

  const result = await service.getDaily("AAPL");

  assertEquals(result.error, null);
  assertEquals(result.data?.length, 1);
  if (result.data) {
    assertEquals(result.data[0].close, "186.28");
  }
});

Deno.test("TiingoService.getDaily - Parameter Validierung", async () => {
  const mockKy = createMockClient(HttpStatus.OK, []);
  const service = new TiingoService(MOCK_KEY, MOCK_URL, mockKy);

  const result = await service.getDaily("");
  assertEquals(result.error?.code, TiingoErrorCodes.VALIDATION_ERROR);
  assertEquals(result.error?.message, TiingoErrorMessages[TiingoErrorCodes.VALIDATION_ERROR].replace("{}", "Ticker ungültig"));
});

Deno.test("TiingoService.getPrices - Erfolgreicher Abruf (Regel 27)", async () => {
  const mockData = [
    { date: "2026-05-08T14:00:00Z", close: 293.57, high: 294.76, low: 292.54, open: 293.92, volume: 1000 }
  ];
  
  const mockKy = createMockClient(HttpStatus.OK, mockData);
  const service = new TiingoService(MOCK_KEY, MOCK_URL, mockKy);

  const result = await service.getPrices("AAPL", "1hour");
  
  assertEquals(result.error, null);
  assertEquals(result.data?.length, 1);
  if (result.data) {
    assertEquals(result.data[0].close, "293.57"); // Regel 27: String via Coercion
    assertEquals(result.data[0].volume, 1000);
  }
});

Deno.test("TiingoService.getPrices - Parameter Validierung", async () => {
  const mockKy = createMockClient(HttpStatus.OK, []);
  const service = new TiingoService(MOCK_KEY, MOCK_URL, mockKy);

  const result1 = await service.getPrices("", "1hour");
  assertEquals(result1.error?.code, TiingoErrorCodes.VALIDATION_ERROR);
  assertEquals(result1.error?.message, TiingoErrorMessages[TiingoErrorCodes.VALIDATION_ERROR].replace("{}", "Ticker ungültig"));

  const result2 = await service.getPrices("AAPL", " ");
  assertEquals(result2.error?.code, TiingoErrorCodes.VALIDATION_ERROR);
  assertEquals(result2.error?.message, TiingoErrorMessages[TiingoErrorCodes.VALIDATION_ERROR].replace("{}", "Frequenz ungültig"));
});

Deno.test("TiingoService.getPrices - Validierung der IEX-Daten (Regel 26)", async () => {
  // Invalid data: high as non-number/non-string
  const invalidData = [
    { date: "2026-05-08T14:00:00Z", close: 293.57, high: null, low: 292.54, open: 293.92 }
  ];
  
  const mockKy = createMockClient(HttpStatus.OK, invalidData);
  const service = new TiingoService(MOCK_KEY, MOCK_URL, mockKy);

  const result = await service.getPrices("AAPL", "1hour");
  
  assertEquals(result.data, null);
  assertEquals(result.error?.code, TiingoErrorCodes.VALIDATION_ERROR);
  const expectedMsg = TiingoErrorMessages[TiingoErrorCodes.VALIDATION_ERROR].replace("{}", "");
  assertEquals(result.error?.message.startsWith(expectedMsg), true);
});

Deno.test("TiingoService.getPrices - Handling von unvollständigen HTTP-Fehlern (Coverage)", async () => {
  const mockKy = {
    get: () => {
      const error = new Error("HTTP Error");
      error.name = "HTTPError";
      // FEHLT: 'response' property -> triggert default internal error oder fallback
      return Promise.reject(error);
    }
  } as unknown as typeof ky;
  const service = new TiingoService(MOCK_KEY, MOCK_URL, mockKy);

  const result = await service.getPrices("AAPL", "1hour");

  assertEquals(result.data, null);
  assertEquals(result.error?.code, TiingoErrorCodes.INTERNAL_ERROR);
  assertEquals(result.error?.message, TiingoErrorMessages[TiingoErrorCodes.INTERNAL_ERROR].replace("{}", "HTTP Error"));
});

Deno.test("TiingoService.getPrices - Handling von HTTP-Fehlern ohne Response-Objekt (Coverage)", async () => {
  const mockKy = {
    get: () => {
      const error = new Error("HTTP Error");
      error.name = "HTTPError";
      // 'response' ist kein Response-Objekt
      Object.defineProperty(error, "response", { value: { status: 500 } });
      return Promise.reject(error);
    }
  } as unknown as typeof ky;
  const service = new TiingoService(MOCK_KEY, MOCK_URL, mockKy);

  const result = await service.getPrices("AAPL", "1hour");

  assertEquals(result.data, null);
  assertEquals(result.error?.code, TiingoErrorCodes.INTERNAL_ERROR);
  assertEquals(result.error?.message, TiingoErrorMessages[TiingoErrorCodes.INTERNAL_ERROR].replace("{}", "HTTP Error"));
});

Deno.test("TiingoService.getDaily - Fehlerbehandlung 401 (Unauthorized)", async () => {
  const mockKy = createMockClient(HttpStatus.UNAUTHORIZED, { detail: "Invalid token" });
  const service = new TiingoService(MOCK_KEY, MOCK_URL, mockKy);

  const result = await service.getDaily("AAPL");

  assertEquals(result.data, null);
  assertEquals(result.error?.code, TiingoErrorCodes.UNAUTHORIZED);
  assertEquals(result.error?.message, TiingoErrorMessages[TiingoErrorCodes.UNAUTHORIZED]);
});

Deno.test("TiingoService.getDaily - Fehlerbehandlung 404 (Not Found)", async () => {
  const mockKy = createMockClient(HttpStatus.NOT_FOUND, { detail: "Not found" });
  const service = new TiingoService(MOCK_KEY, MOCK_URL, mockKy);

  const result = await service.getDaily("UNKNOWN");

  assertEquals(result.data, null);
  assertEquals(result.error?.code, TiingoErrorCodes.NOT_FOUND);
  assertEquals(result.error?.message, TiingoErrorMessages[TiingoErrorCodes.NOT_FOUND].replace("{}", "unknown"));
});

Deno.test("TiingoService.getDaily - Fehlerbehandlung 429 (Too Many Requests)", async () => {
  const mockKy = createMockClient(HttpStatus.TOO_MANY_REQUESTS, { detail: "Rate limit" });
  const service = new TiingoService(MOCK_KEY, MOCK_URL, mockKy);

  const result = await service.getDaily("AAPL");

  assertEquals(result.data, null);
  assertEquals(result.error?.code, TiingoErrorCodes.RATE_LIMIT);
  assertEquals(result.error?.message, TiingoErrorMessages[TiingoErrorCodes.RATE_LIMIT]);
});

Deno.test("TiingoService.getDaily - Vollständige Zod-Validierung", async () => {
  const mockData = [
    {
      date: "2024-05-13T00:00:00.000Z",
      close: 186.28,
      high: 187.1,
      low: 184.62,
      open: 185.435,
      volume: 72044809,
      adjClose: 184.8632698598,
      adjHigh: 185.6770334484,
      adjLow: 183.2158947902,
      adjOpen: 184.0246964057,
      adjVolume: 72044809,
      divCash: 0.1,
      splitFactor: 1.0
    }
  ];

  const mockKy = createMockClient(HttpStatus.OK, mockData);
  const service = new TiingoService(MOCK_KEY, MOCK_URL, mockKy);

  const result = await service.getDaily("AAPL");

  assertEquals(result.error, null);
  if (result.data) {
    const item = result.data[0];
    assertEquals(item.date, "2024-05-13T00:00:00.000Z");
    assertEquals(item.close, "186.28");
    assertEquals(item.high, "187.1");
    assertEquals(item.low, "184.62");
    assertEquals(item.open, "185.435");
    assertEquals(item.volume, 72044809);
    assertEquals(item.divCash, "0.1");
    assertEquals(item.splitFactor, "1");
  }
});

