// supabase/tests/core/repository/MarketDataRepository_test.ts

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { SupabaseClient, PostgrestError } from "supabase";
import { 
  MarketDataRepository, 
  MarketDbErrorCodes, 
  MarketDbErrorMessages 
} from "core/repository/MarketDataRepository.ts";
import { type MarketDataDailyEntity, type MarketObservationEntity } from "core/models/MarketDataModels.ts";

/**
 * Erstellt einen Supabase-Client Mock.
 */
const createSupabaseMock = (resultOrMethods: any): SupabaseClient => {
  const builder: any = {
    select: () => builder,
    eq: () => builder,
    gte: () => builder,
    lte: () => builder,
    order: () => builder,
    limit: () => builder,
    maybeSingle: () => Promise.resolve({ data: resultOrMethods.data || null, error: resultOrMethods.error || null }),
    upsert: () => Promise.resolve({ error: resultOrMethods.error || null }),
    then: (onfulfilled: any) => Promise.resolve(onfulfilled(resultOrMethods)),
    ...resultOrMethods
  };

  return {
    from: (_table: string) => builder,
  } as unknown as SupabaseClient;
};

Deno.test("MarketDataRepository.upsertMarketData - Erfolgreicher Upsert", async () => {
  const supabase = createSupabaseMock({ error: null });
  const repo = new MarketDataRepository(supabase);

  const data: MarketDataDailyEntity[] = [{
    ticker: "AAPL",
    ts: "2024-05-13T00:00:00Z",
    open: "185.435",
    high: "187.1",
    low: "184.62",
    close: "186.28",
    adj_close: "184.86",
    volume: 72044809
  }];

  const result = await repo.upsertMarketData(data);
  assertEquals(result.error, null);
});

Deno.test("MarketDataRepository.upsertMarketData - Fehlerbehandlung", async () => {
  const mockError: PostgrestError = { code: "23505", message: "Conflict", details: "", hint: "" };
  const supabase = createSupabaseMock({ error: mockError });
  const repo = new MarketDataRepository(supabase);

  const result = await repo.upsertMarketData([{ ticker: "ERR", ts: "now", open: "0", high: "0", low: "0", close: "0", adj_close: "0", volume: 0 }]);
  
  assertEquals(result.data, null);
  assertEquals(result.error?.code, MarketDbErrorCodes.UPSERT_FAILED);
  assertEquals(result.error?.message, MarketDbErrorMessages[MarketDbErrorCodes.UPSERT_FAILED].replace("{}", mockError.message));
});

Deno.test("MarketDataRepository.upsertObservations - Erfolgreicher Upsert", async () => {
  const supabase = createSupabaseMock({ error: null });
  const repo = new MarketDataRepository(supabase);

  const data: MarketObservationEntity[] = [{
    ticker: "AAPL",
    ts: "2024-05-13T14:00:00Z",
    open: "186.10",
    high: "187.50",
    low: "185.90",
    close: "187.20",
    is_para_mode: false
  }];

  const result = await repo.upsertObservations(data);
  assertEquals(result.error, null);
});

Deno.test("MarketDataRepository.getLatestTimestamp - Liefert neuesten TS", async () => {
  const mockTs = "2024-05-13T10:00:00Z";
  const supabase = createSupabaseMock({ data: { ts: mockTs }, error: null });
  const repo = new MarketDataRepository(supabase);

  const result = await repo.getLatestTimestamp("AAPL");
  
  assertEquals(result.error, null);
  assertEquals(result.data, mockTs);
});

Deno.test("MarketDataRepository.getLatestTimestamp - Liefert null wenn keine Daten", async () => {
  const supabase = createSupabaseMock({ data: null, error: null });
  const repo = new MarketDataRepository(supabase);

  const result = await repo.getLatestTimestamp("UNKNOWN");
  
  assertEquals(result.error, null);
  assertEquals(result.data, null);
});

Deno.test("MarketDataRepository.getMarketDataRange - Erfolgreicher Abruf", async () => {
  const mockData = [
    { ticker: "AAPL", ts: "2024-05-10", close: "180" },
    { ticker: "AAPL", ts: "2024-05-13", close: "186" }
  ];
  const supabase = createSupabaseMock({ data: mockData, error: null });
  const repo = new MarketDataRepository(supabase);

  const result = await repo.getMarketDataRange("AAPL", "2024-05-10", "2024-05-13");

  assertEquals(result.error, null);
  assertEquals(result.data?.length, 2);
  if (result.data) {
    assertEquals(result.data[0].ts, "2024-05-10");
  }
});
