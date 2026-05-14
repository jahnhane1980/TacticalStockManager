// supabase/tests/core/repository/PortfolioRepository_test.ts

import { assertEquals, assertNotEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { SupabaseClient, PostgrestError } from "supabase";
import { PortfolioRepository, PortfolioDbErrorCodes, PortfolioDbErrorMessages } from "core/repository/PortfolioRepository.ts";
import { type PortfolioEntity } from "core/models/PortfolioModels.ts";

/**
 * Erweiterter Supabase-Mock zur Verifizierung von Aufruf-Parametern (Regel 25).
 */
const createCaptureMock = (result?: { data?: any; error?: any }) => {
  let capturedData: any = null;
  let capturedOptions: any = null;
  let capturedFilters: any[] = [];
  let capturedUpdates: any = null;

  const builder: any = {
    select: () => builder,
    eq: (col: string, val: any) => {
      capturedFilters.push({ method: "eq", col, val });
      return builder;
    },
    or: (val: string) => {
      capturedFilters.push({ method: "or", val });
      return builder;
    },
    order: (col: string, opts: any) => {
      capturedFilters.push({ method: "order", col, opts });
      return builder;
    },
    limit: (val: number) => {
      capturedFilters.push({ method: "limit", val });
      return builder;
    },
    in: (col: string, vals: any[]) => {
      capturedFilters.push({ method: "in", col, vals });
      // If result.error is set, return it immediately for .in calls (update/delete)
      return Promise.resolve({ error: result?.error || null });
    },
    update: (data: any) => {
      capturedUpdates = data;
      return builder;
    },
    upsert: (data: any, options: any) => {
      capturedData = data;
      capturedOptions = options;
      return Promise.resolve({ error: result?.error || null });
    },
    then: (onfulfilled: any) => {
      if (typeof onfulfilled === 'function') {
        return Promise.resolve(onfulfilled({ data: result?.data || null, error: result?.error || null }));
      }
      return Promise.resolve({ data: result?.data || null, error: result?.error || null });
    }
  };

  const client = {
    from: (_table: string) => builder,
  } as unknown as SupabaseClient;

  return { 
    client, 
    getCaptured: () => ({ data: capturedData, options: capturedOptions, filters: capturedFilters, updates: capturedUpdates }) 
  };
};

// Test 1: getStoredTickers Erfolgsfall (inkl. neuer Felder)
Deno.test("PortfolioRepository.getStoredTickers - Erfolgsfall inkl. neuer Felder", async () => {
  const mockData = [
    { 
      ticker: "AAPL", 
      monitoring_config: { 
        is_active: true,
        last_historical_sync: "2024-05-13T10:00:00Z",
        last_observation_sync: null,
        locked_until: null
      } 
    }
  ];
  const { client } = createCaptureMock({ data: mockData, error: null });
  const repo = new PortfolioRepository(client);

  const result = await repo.getStoredTickers();

  assertEquals(result.error, null);
  assertEquals(result.data?.[0], {
    ticker: "AAPL",
    is_active: true,
    last_historical_sync: "2024-05-13T10:00:00Z",
    last_observation_sync: null,
    locked_until: null
  });
});

// Test 2: getStoredTickers Fehlerfall
Deno.test("PortfolioRepository.getStoredTickers - Fehlerbehandlung", async () => {
  const mockError: PostgrestError = {
    code: "PGRST116",
    message: "Table not found",
    details: "",
    hint: "",
  };
  const { client } = createCaptureMock({ error: mockError });
  const repo = new PortfolioRepository(client);

  const result = await repo.getStoredTickers();

  assertEquals(result.data, null);
  assertEquals(result.error?.code, PortfolioDbErrorCodes.FETCH_TICKERS_FAILED);
});

// Test 3: getTickersForSync Erfolgsfall und Parameter-Check
Deno.test("PortfolioRepository.getTickersForSync - Erfolgreicher Abruf und Lock", async () => {
  const mockTickers = [{ ticker: "AAPL" }, { ticker: "MSFT" }];
  const { client, getCaptured } = createCaptureMock({ data: mockTickers, error: null });
  const repo = new PortfolioRepository(client);

  const result = await repo.getTickersForSync(2);

  assertEquals(result.error, null);
  assertEquals(result.data, ["AAPL", "MSFT"]);

  const captured = getCaptured();
  
  // 1. Verifiziere Filter für den Abruf
  const activeFilter = captured.filters.find(f => f.col === "is_active");
  const orFilter = captured.filters.find(f => f.method === "or");
  const limitFilter = captured.filters.find(f => f.method === "limit");
  const orderFilter = captured.filters.find(f => f.method === "order");

  assertEquals(activeFilter?.val, true);
  assertEquals(orFilter?.val.includes("locked_until.is.null"), true);
  assertEquals(limitFilter?.val, 2);
  assertEquals(orderFilter?.col, "last_observation_sync");

  // 2. Verifiziere, dass Lock-Update ausgeführt wurde
  assertEquals(captured.updates?.hasOwnProperty("locked_until"), true);
  // Zeitstempel sollte in der Zukunft liegen
  const lockedTime = new Date(captured.updates.locked_until).getTime();
  assertEquals(lockedTime > Date.now(), true);
});

// Test 4: getTickersForSync Fehlerfall
Deno.test("PortfolioRepository.getTickersForSync - Fehlerbehandlung", async () => {
  const mockError: PostgrestError = { code: "500", message: "DB Error", details: "", hint: "" };
  const { client } = createCaptureMock({ error: mockError });
  const repo = new PortfolioRepository(client);

  const result = await repo.getTickersForSync(5);

  assertEquals(result.data, null);
  assertEquals(result.error?.code, PortfolioDbErrorCodes.SYNC_FETCH_FAILED);
});

// Test 5: upsertPortfolioPositions Erfolgsfall (inkl. neuer Felder)
Deno.test("PortfolioRepository.upsertPortfolioPositions - Erfolgreicher Upsert inkl. neuer Felder", async () => {
  const { client, getCaptured } = createCaptureMock({ error: null });
  const repo = new PortfolioRepository(client);

  const positions: PortfolioEntity[] = [
    {
      ticker: "AAPL",
      name: "Apple Inc.",
      isin: "US0378331005",
      quantity: "10",
      average_price_paid: "150.50",
      current_price: "175",
      total_cost_eur: "1505",
      current_value_eur: "1750",
      fx_impact: "0",
      is_active: true,
      frequency_id: "DAILY",
      last_sync: "2026-05-12T00:00:00Z",
      // Neue optionale Felder
      last_historical_sync: "2026-05-13T00:00:00Z",
      last_observation_sync: "2026-05-14T10:00:00Z",
      locked_until: null
    },
  ];

  const result = await repo.upsertPortfolioPositions(positions);

  assertEquals(result.error, null);
  const captured = getCaptured();
  // Wir prüfen den Upsert auf monitoring_config (da zwei Aufrufe stattfinden, fängt der Mock den letzten ab).
  assertEquals(captured.options?.onConflict, "ticker");
  // Verifiziere dass die Daten übergeben wurden (im capturedData des letzten Aufrufs)
  assertEquals(captured.data?.[0].ticker, "AAPL");
});

Deno.test("PortfolioRepository.upsertPortfolioPositions - Fehler bei monitoring_config", async () => {
  const mockError: PostgrestError = { code: "400", message: "Upsert Config Error", details: "", hint: "" };
  const { client } = createCaptureMock({ error: mockError });
  const repo = new PortfolioRepository(client);

  const result = await repo.upsertPortfolioPositions([{ ticker: "AAPL" } as any]);

  assertEquals(result.data, null);
  assertEquals(result.error?.code, PortfolioDbErrorCodes.UPSERT_FAILED);
});

// Test 6: deactivatePositions Erfolgsfall
Deno.test("PortfolioRepository.deactivatePositions - Erfolgreiche Deaktivierung", async () => {
  const { client, getCaptured } = createCaptureMock({ error: null });
  const repo = new PortfolioRepository(client);

  const result = await repo.deactivatePositions(["AAPL", "TSLA"]);

  assertEquals(result.error, null);
  const captured = getCaptured();
  const inFilter = captured.filters.find(f => f.method === "in");
  assertEquals(inFilter?.vals, ["AAPL", "TSLA"]);
});

Deno.test("PortfolioRepository.deactivatePositions - Fehlerbehandlung", async () => {
  const mockError: PostgrestError = { code: "500", message: "Deactivate Error", details: "", hint: "" };
  const { client } = createCaptureMock({ error: mockError });
  const repo = new PortfolioRepository(client);

  const result = await repo.deactivatePositions(["AAPL"]);

  assertEquals(result.data, null);
  assertEquals(result.error?.code, PortfolioDbErrorCodes.DEACTIVATE_FAILED);
});

// Test 7: unlockTicker Erfolgsfall
Deno.test("PortfolioRepository.unlockTicker - Erfolgreiches Entsperren (Erfolg)", async () => {
  const { client, getCaptured } = createCaptureMock({ error: null });
  const repo = new PortfolioRepository(client);

  const result = await repo.unlockTicker("AAPL", true);

  assertEquals(result.error, null);
  const captured = getCaptured();
  assertEquals(captured.updates?.locked_until, null);
  assertNotEquals(captured.updates?.last_observation_sync, undefined);
});

// Test 8: unlockTicker Fehlerfall (ohne Sync-Update)
Deno.test("PortfolioRepository.unlockTicker - Erfolgreiches Entsperren (Fehlerfall)", async () => {
  const { client, getCaptured } = createCaptureMock({ error: null });
  const repo = new PortfolioRepository(client);

  const result = await repo.unlockTicker("AAPL", false);

  assertEquals(result.error, null);
  const captured = getCaptured();
  assertEquals(captured.updates?.locked_until, null);
  assertEquals(captured.updates?.last_observation_sync, undefined);
});

Deno.test("PortfolioRepository.unlockTicker - Fehlerbehandlung", async () => {
  const mockError: PostgrestError = { code: "403", message: "Unlock Forbidden", details: "", hint: "" };
  const { client } = createCaptureMock({ error: mockError });
  const repo = new PortfolioRepository(client);

  const result = await repo.unlockTicker("AAPL", true);

  assertEquals(result.data, null);
  assertEquals(result.error?.code, PortfolioDbErrorCodes.UNLOCK_FAILED);
});
