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
 * Erweiterter Supabase-Mock zur Verifizierung von Aufruf-Parametern (Regel 25).
 */
const createCaptureMock = (result?: { data?: any; error?: any }) => {
  let capturedOptions: any = null;
  let capturedData: any = null;
  let capturedFilters: any[] = [];
  let capturedTable: string | null = null;

  const builder: any = {
    select: () => builder,
    eq: (col: string, val: any) => {
      capturedFilters.push({ method: "eq", col, val });
      return builder;
    },
    gte: (col: string, val: any) => {
      capturedFilters.push({ method: "gte", col, val });
      return builder;
    },
    lte: (col: string, val: any) => {
      capturedFilters.push({ method: "lte", col, val });
      return builder;
    },
    order: () => builder,
    limit: () => builder,
    maybeSingle: () => Promise.resolve({ data: result?.data || null, error: result?.error || null }),
    upsert: (data: any, options: any) => {
      capturedData = data;
      capturedOptions = options;
      return Promise.resolve({ error: result?.error || null });
    },
    // Deno Test runner checks for .then if it's treated as a promise
    then: (onfulfilled: any) => {
      if (typeof onfulfilled === 'function') {
        return Promise.resolve(onfulfilled({ data: result?.data || null, error: result?.error || null }));
      }
      return Promise.resolve({ data: result?.data || null, error: result?.error || null });
    }
  };

  const client = {
    from: (table: string) => {
      capturedTable = table;
      return builder;
    },
  } as unknown as SupabaseClient;

  return { 
    client, 
    getCaptured: () => ({ data: capturedData, options: capturedOptions, filters: capturedFilters, table: capturedTable }) 
  };
};

Deno.test("MarketDataRepository.upsertMarketData - Erfolgreicher Upsert mit Idempotenz (Regel 28)", async () => {
  const { client, getCaptured } = createCaptureMock({ error: null });
  const repo = new MarketDataRepository(client);

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
  
  const captured = getCaptured();
  assertEquals(captured.table, "market_data_daily");
  assertEquals(captured.options?.onConflict, "ticker,ts");
  assertEquals(captured.data, data);
});

Deno.test("MarketDataRepository.upsertMarketData - Fehlerbehandlung", async () => {
  const mockError: PostgrestError = { code: "23505", message: "Conflict", details: "", hint: "" };
  const { client } = createCaptureMock({ error: mockError });
  const repo = new MarketDataRepository(client);

  const result = await repo.upsertMarketData([{ ticker: "ERR", ts: "now", open: "0", high: "0", low: "0", close: "0", adj_close: "0", volume: 0 }]);
  
  assertEquals(result.data, null);
  assertEquals(result.error?.code, MarketDbErrorCodes.UPSERT_FAILED);
  assertEquals(result.error?.message, MarketDbErrorMessages[MarketDbErrorCodes.UPSERT_FAILED].replace("{}", mockError.message));
});

Deno.test("MarketDataRepository.upsertObservations - Erfolgreicher Upsert mit Detail-Feldern", async () => {
  const { client, getCaptured } = createCaptureMock({ error: null });
  const repo = new MarketDataRepository(client);

  const data: MarketObservationEntity[] = [{
    ticker: "AAPL",
    ts: "2024-05-13T14:00:00Z",
    open: "186.10",
    high: "187.50",
    low: "185.90",
    close: "187.20",
    rescue_sma_10: "185.50",
    chandelier_stop: "184.20",
    is_para_mode: true
  }];

  const result = await repo.upsertObservations(data);
  assertEquals(result.error, null);
  
  const captured = getCaptured();
  assertEquals(captured.table, "market_data_observation");
  assertEquals(captured.options?.onConflict, "ticker,ts");
  assertEquals(captured.data, data);
});

Deno.test("MarketDataRepository.upsertObservations - Fehlerbehandlung", async () => {
  const mockError: PostgrestError = { code: "500", message: "DB Error", details: "", hint: "" };
  const { client } = createCaptureMock({ error: mockError });
  const repo = new MarketDataRepository(client);

  const result = await repo.upsertObservations([{ ticker: "ERR", ts: "now", close: "0" } as any]);
  
  assertEquals(result.data, null);
  assertEquals(result.error?.code, MarketDbErrorCodes.UPSERT_FAILED);
});

Deno.test("MarketDataRepository.getLatestTimestamp - Liefert neuesten TS", async () => {
  const mockTs = "2024-05-13T10:00:00Z";
  const { client } = createCaptureMock({ data: { ts: mockTs }, error: null });
  const repo = new MarketDataRepository(client);

  const result = await repo.getLatestTimestamp("AAPL");
  
  assertEquals(result.error, null);
  assertEquals(result.data, mockTs);
});

Deno.test("MarketDataRepository.getLatestTimestamp - Fehlerbehandlung", async () => {
  const mockError: PostgrestError = { code: "400", message: "Bad Request", details: "", hint: "" };
  const { client } = createCaptureMock({ error: mockError });
  const repo = new MarketDataRepository(client);

  const result = await repo.getLatestTimestamp("AAPL");
  
  assertEquals(result.data, null);
  assertEquals(result.error?.code, MarketDbErrorCodes.LATEST_TS_FAILED);
});

Deno.test("MarketDataRepository.getLatestMarketData - Liefert neuesten Datensatz", async () => {
  const mockData = { ticker: "AAPL", ts: "2024-05-13", close: "186" };
  const { client } = createCaptureMock({ data: mockData, error: null });
  const repo = new MarketDataRepository(client);

  const result = await repo.getLatestMarketData("AAPL");
  
  assertEquals(result.error, null);
  assertEquals(result.data?.ticker, "AAPL");
  assertEquals(result.data?.ts, "2024-05-13");
});

Deno.test("MarketDataRepository.getMarketDataRange - Erfolgreicher Abruf mit Filtern", async () => {
  const mockData = [
    { ticker: "AAPL", ts: "2024-05-10", close: "180" },
    { ticker: "AAPL", ts: "2024-05-13", close: "186" }
  ];
  const { client, getCaptured } = createCaptureMock({ data: mockData, error: null });
  const repo = new MarketDataRepository(client);

  const result = await repo.getMarketDataRange("AAPL", "2024-05-10", "2024-05-13");

  assertEquals(result.error, null);
  assertEquals(result.data?.length, 2);
  
  const captured = getCaptured();
  const tickerFilter = captured.filters.find(f => f.col === "ticker");
  const gteFilter = captured.filters.find(f => f.method === "gte");
  const lteFilter = captured.filters.find(f => f.method === "lte");
  
  assertEquals(tickerFilter?.val, "AAPL");
  assertEquals(gteFilter?.val, "2024-05-10");
  assertEquals(lteFilter?.val, "2024-05-13");
});

Deno.test("MarketDataRepository.getMarketDataRange - Fehlerbehandlung", async () => {
  const mockError: PostgrestError = { code: "404", message: "Not Found", details: "", hint: "" };
  const { client } = createCaptureMock({ error: mockError });
  const repo = new MarketDataRepository(client);

  const result = await repo.getMarketDataRange("AAPL", "2024-05-10", "2024-05-13");
  
  assertEquals(result.data, null);
  assertEquals(result.error?.code, MarketDbErrorCodes.FETCH_FAILED);
});

Deno.test("MarketDataRepository.upsertMarketData - Early Exit bei leerem Array", async () => {
  const { client } = createCaptureMock();
  const repo = new MarketDataRepository(client);

  const result = await repo.upsertMarketData([]);
  
  assertEquals(result.data, null);
  assertEquals(result.error, null);
});

Deno.test("MarketDataRepository.upsertObservations - Early Exit bei leerem Array", async () => {
  const { client } = createCaptureMock();
  const repo = new MarketDataRepository(client);

  const result = await repo.upsertObservations([]);
  
  assertEquals(result.data, null);
  assertEquals(result.error, null);
});

Deno.test("MarketDataRepository.getLatestTimestamp - Fallback bei keinen Daten", async () => {
  const { client } = createCaptureMock({ data: null, error: null });
  const repo = new MarketDataRepository(client);

  const result = await repo.getLatestTimestamp("AAPL");
  
  assertEquals(result.data, null);
  assertEquals(result.error, null);
});

Deno.test("MarketDataRepository.getLatestMarketData - Fehlerbehandlung", async () => {
  const mockError: PostgrestError = { code: "500", message: "Internal Server Error", details: "", hint: "" };
  const { client } = createCaptureMock({ error: mockError });
  const repo = new MarketDataRepository(client);

  const result = await repo.getLatestMarketData("AAPL");
  
  assertEquals(result.data, null);
  assertEquals(result.error?.code, MarketDbErrorCodes.FETCH_FAILED);
});

Deno.test("MarketDataRepository.getMarketDataRange - Fallback bei keinen Daten", async () => {
  const { client } = createCaptureMock({ data: null, error: null });
  const repo = new MarketDataRepository(client);

  const result = await repo.getMarketDataRange("AAPL", "2024-05-10", "2024-05-13");
  
  assertEquals(result.data, []);
  assertEquals(result.error, null);
});
