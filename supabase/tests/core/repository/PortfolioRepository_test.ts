// supabase/tests/core/repository/PortfolioRepository_test.ts

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { SupabaseClient, PostgrestError } from "supabase";
import { PortfolioRepository, PortfolioDbErrorCodes, PortfolioDbErrorMessages, type PortfolioEntity } from "core/repository/PortfolioRepository.ts";

/**
 * Hilfs-Typen für das Supabase-Mocking ohne 'any' (Regel 1).
 */
type MockQueryBuilder = {
  select: (columns: string) => Promise<{ data: unknown[] | null; error: PostgrestError | null }>;
  upsert: (values: unknown, options: { onConflict: string }) => Promise<{ error: PostgrestError | null }>;
  delete: () => { in: (column: string, values: string[]) => Promise<{ error: PostgrestError | null }> };
};

/**
 * Erstellt einen Supabase-Client Mock.
 * 
 * @param queryBuilder Ein Objekt, das die Datenbank-Methoden simuliert.
 */
const createSupabaseMock = (queryBuilder: Partial<MockQueryBuilder>): SupabaseClient => {
  return {
    from: (_table: string) => queryBuilder,
  } as unknown as SupabaseClient;
};

// Test 1: getStoredTickers Erfolgsfall
Deno.test("PortfolioRepository - Test 1: getStoredTickers Erfolgsfall", async () => {
  const mockData = [{ ticker: "AAPL" }, { ticker: "TSLA" }];
  const supabase = createSupabaseMock({
    select: () => Promise.resolve({ data: mockData, error: null }),
  });
  const repo = new PortfolioRepository(supabase);

  const result = await repo.getStoredTickers();

  assertEquals(result.error, null);
  assertEquals(result.data, ["AAPL", "TSLA"]);
});

// Test 2: getStoredTickers Fehlerfall
Deno.test("PortfolioRepository - Test 2: getStoredTickers Fehlerfall", async () => {
  const mockError: PostgrestError = {
    code: "PGRST116",
    message: "Table not found",
    details: "",
    hint: "",
  };
  const supabase = createSupabaseMock({
    select: () => Promise.resolve({ data: null, error: mockError }),
  });
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

  const result = await repo.upsertPortfolioPositions([]);

  assertEquals(result.data, null);
  assertEquals(result.error?.code, PortfolioDbErrorCodes.UPSERT_FAILED);
});

// Test 5: deletePositions Erfolgsfall
Deno.test("PortfolioRepository - Test 5: deletePositions Erfolgsfall", async () => {
  const supabase = createSupabaseMock({
    delete: () => ({
      in: () => Promise.resolve({ error: null }),
    }),
  });
  const repo = new PortfolioRepository(supabase);

  const result = await repo.deletePositions(["AAPL"]);

  assertEquals(result.error, null);
});

// Test 6: deletePositions mit leerer Liste (Edge Case)
Deno.test("PortfolioRepository - Test 6: deletePositions mit leerer Liste", async () => {
  const supabase = createSupabaseMock({}); // delete() sollte gar nicht aufgerufen werden
  const repo = new PortfolioRepository(supabase);

  const result = await repo.deletePositions([]);

  assertEquals(result.error, null);
});

// Test 7: deletePositions Fehlerfall
Deno.test("PortfolioRepository - Test 7: deletePositions Fehlerfall", async () => {
  const mockError: PostgrestError = {
    code: "42703", // Undefined column
    message: "Column not found",
    details: "",
    hint: "",
  };
  const supabase = createSupabaseMock({
    delete: () => ({
      in: () => Promise.resolve({ error: mockError }),
    }),
  });
  const repo = new PortfolioRepository(supabase);

  const result = await repo.deletePositions(["INVALID"]);

  assertEquals(result.data, null);
  assertEquals(result.error?.code, PortfolioDbErrorCodes.DELETE_FAILED);
});
