// supabase/tests/core/repository/PortfolioRepository_test.ts

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { SupabaseClient, PostgrestError } from "supabase";
import { PortfolioRepository, PortfolioDbErrorCodes, PortfolioDbErrorMessages, type PortfolioEntity } from "core/repository/PortfolioRepository.ts";

/**
 * Erstellt einen Supabase-Client Mock.
 * 
 * @param resultOrMethods Entweder das Ergebnis {data, error} oder ein Objekt mit Mock-Methoden.
 */
const createSupabaseMock = (resultOrMethods: any): SupabaseClient => {
  const builder: any = {
    select: () => builder,
    eq: () => builder,
    update: () => builder,
    in: () => Promise.resolve({ error: resultOrMethods.error || null }),
    upsert: () => Promise.resolve({ error: resultOrMethods.error || null }),
    delete: () => builder, // Für Abwärtskompatibilität, falls noch genutzt
    then: (onfulfilled: any) => Promise.resolve(onfulfilled(resultOrMethods)),
    ...resultOrMethods
  };

  return {
    from: (_table: string) => builder,
  } as unknown as SupabaseClient;
};

// Test 1: getStoredTickers Erfolgsfall
Deno.test("PortfolioRepository - Test 1: getStoredTickers Erfolgsfall", async () => {
  const mockData = [
    { ticker: "AAPL", monitoring_config: { is_active: true } },
    { ticker: "TSLA", monitoring_config: { is_active: true } }
  ];
  const supabase = createSupabaseMock({ data: mockData, error: null });
  const repo = new PortfolioRepository(supabase);

  const result = await repo.getStoredTickers();

  assertEquals(result.error, null);
  assertEquals(result.data, [
    { ticker: "AAPL", is_active: true },
    { ticker: "TSLA", is_active: true }
  ]);
});

// Test 2: getStoredTickers Fehlerfall
Deno.test("PortfolioRepository - Test 2: getStoredTickers Fehlerfall", async () => {
  const mockError: PostgrestError = {
    code: "PGRST116",
    message: "Table not found",
    details: "",
    hint: "",
  };
  const supabase = createSupabaseMock({ data: null, error: mockError });
  const repo = new PortfolioRepository(supabase);

  const result = await repo.getStoredTickers();

  assertEquals(result.data, null);
  assertEquals(result.error?.code, PortfolioDbErrorCodes.FETCH_TICKERS_FAILED);
  assertEquals(
    result.error?.message,
    PortfolioDbErrorMessages[PortfolioDbErrorCodes.FETCH_TICKERS_FAILED].replace("{}", mockError.message)
  );
});

// Test 3: upsertPortfolioPositions Erfolgsfall (Regel 27 Compliance)
Deno.test("PortfolioRepository - Test 3: upsertPortfolioPositions Erfolgsfall (Numeric as Strings)", async () => {
  const supabase = createSupabaseMock({
    upsert: () => Promise.resolve({ error: null }),
  });
  const repo = new PortfolioRepository(supabase);

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
      raw_snapshot: null,
    },
  ];

  // Wir validieren hier den Repository-Aufruf.
  const result = await repo.upsertPortfolioPositions(positions);

  assertEquals(result.data, null);
  assertEquals(result.error, null);
});

// Test 4: upsertPortfolioPositions Fehlerfall
Deno.test("PortfolioRepository - Test 4: upsertPortfolioPositions Fehlerfall", async () => {
  const mockError: PostgrestError = {
    code: "23505", // Unique violation
    message: "Duplicate key",
    details: "",
    hint: "",
  };
  const supabase = createSupabaseMock({
    upsert: () => Promise.resolve({ error: mockError }),
  });
  const repo = new PortfolioRepository(supabase);

  const dummyPosition: PortfolioEntity = {
    ticker: "ERROR",
    is_active: true,
    frequency_id: "daily",
    quantity: "0",
    average_price_paid: "0",
    current_price: "0",
    total_cost_eur: "0",
    current_value_eur: "0",
    fx_impact: "0"
  };

  const result = await repo.upsertPortfolioPositions([dummyPosition]);

  assertEquals(result.data, null);
  assertEquals(result.error?.code, PortfolioDbErrorCodes.UPSERT_FAILED);
});

// Test 5: deactivatePositions Erfolgsfall
Deno.test("PortfolioRepository - Test 5: deactivatePositions Erfolgsfall", async () => {
  const supabase = createSupabaseMock({
    update: () => ({
      in: () => Promise.resolve({ error: null }),
    }),
  });
  const repo = new PortfolioRepository(supabase);

  const result = await repo.deactivatePositions(["AAPL"]);

  assertEquals(result.error, null);
});

// Test 6: deactivatePositions mit leerer Liste (Edge Case)
Deno.test("PortfolioRepository - Test 6: deactivatePositions mit leerer Liste", async () => {
  const supabase = createSupabaseMock({}); // update() sollte gar nicht aufgerufen werden
  const repo = new PortfolioRepository(supabase);

  const result = await repo.deactivatePositions([]);

  assertEquals(result.error, null);
});

// Test 7: deactivatePositions Fehlerfall
Deno.test("PortfolioRepository - Test 7: deactivatePositions Fehlerfall", async () => {
  const mockError: PostgrestError = {
    code: "42703", // Undefined column
    message: "Column not found",
    details: "",
    hint: "",
  };
  const supabase = createSupabaseMock({
    update: () => ({
      in: () => Promise.resolve({ error: mockError }),
    }),
  });
  const repo = new PortfolioRepository(supabase);

  const result = await repo.deactivatePositions(["INVALID"]);

  assertEquals(result.data, null);
  assertEquals(result.error?.code, PortfolioDbErrorCodes.DEACTIVATE_FAILED);
});
