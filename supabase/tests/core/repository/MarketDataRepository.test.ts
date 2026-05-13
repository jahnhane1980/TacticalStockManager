// supabase/tests/core/repository/MarketDataRepository.test.ts

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { SupabaseClient } from "supabase";
import { 
  MarketDataRepository,
  MarketDbErrorCodes,
  MarketDbErrorMessages
} from "core/repository/MarketDataRepository.ts";
import { type MarketDataDailyEntity } from "core/models/MarketDataModels.ts";
import { PostgrestError } from "supabase";

/**
 * Erweiterter Supabase-Mock zur Verifizierung von Aufruf-Parametern (Regel 25).
 */
const createCaptureMock = (result?: { data?: any; error?: any }) => {
  let capturedOptions: any = null;
  let capturedData: any = null;

  const builder: any = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    limit: () => builder,
    maybeSingle: () => Promise.resolve({ data: result?.data || null, error: result?.error || null }),
    upsert: (data: any, options: any) => {
      capturedData = data;
      capturedOptions = options;
      return Promise.resolve({ error: result?.error || null });
    }
  };

  const client = {
    from: (_table: string) => builder,
  } as unknown as SupabaseClient;

  return { client, getCaptured: () => ({ data: capturedData, options: capturedOptions }) };
};

Deno.test("MarketDataRepository.upsertMarketData - Verifiziert Idempotenz-Parameter (Regel 28)", async () => {
  const { client, getCaptured } = createCaptureMock();
  const repo = new MarketDataRepository(client);

  const testData: MarketDataDailyEntity[] = [{
    ticker: "AAPL",
    ts: "2024-05-13T00:00:00Z",
    open: "185.435",
    high: "187.1",
    low: "184.62",
    close: "186.28",
    adj_close: "184.86",
    volume: 72044809
  }];

  const result = await repo.upsertMarketData(testData);

  // 1. Ergebnis prüfen
  assertEquals(result.error, null);

  // 2. Idempotenz-Parameter prüfen (onConflict: ticker,ts)
  const captured = getCaptured();
  assertEquals(captured.options?.onConflict, "ticker,ts");
  assertEquals(captured.data, testData);
});

Deno.test("MarketDataRepository.getLatestTimestamp - Liefert Zeitstempel bei Erfolg", async () => {
  const mockTs = "2024-05-13T10:00:00Z";
  const { client } = createCaptureMock({ data: { ts: mockTs } });
  const repo = new MarketDataRepository(client);

  const result = await repo.getLatestTimestamp("AAPL");

  assertEquals(result.error, null);
  assertEquals(result.data, mockTs);
});

Deno.test("MarketDataRepository.getLatestTimestamp - Liefert null wenn keine Daten vorhanden", async () => {
  const { client } = createCaptureMock({ data: null });
  const repo = new MarketDataRepository(client);

  const result = await repo.getLatestTimestamp("UNKNOWN");

  assertEquals(result.error, null);
  assertEquals(result.data, null);
});

Deno.test("MarketDataRepository - Verifiziert Error-Handling (Regel 14)", async () => {
  const mockError: PostgrestError = {
    code: "PGRST116",
    message: "Connection failed",
    details: "",
    hint: ""
  };
  const { client } = createCaptureMock({ error: mockError });
  const repo = new MarketDataRepository(client);

  const result = await repo.getLatestTimestamp("AAPL");

  assertEquals(result.data, null);
  assertEquals(result.error?.code, MarketDbErrorCodes.LATEST_TS_FAILED);
  
  // Verifikation der Nachricht aus dem Dictionary (Regel 14)
  const expectedMessage = MarketDbErrorMessages[MarketDbErrorCodes.LATEST_TS_FAILED].replace("{}", mockError.message);
  assertEquals(result.error?.message, expectedMessage);
});
