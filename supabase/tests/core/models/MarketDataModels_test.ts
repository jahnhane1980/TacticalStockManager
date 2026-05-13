import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { MarketDataDailyEntitySchema, MarketObservationEntitySchema } from "core/models/MarketDataModels.ts";

Deno.test("MarketDataDailyEntitySchema - Validiert einen vollständigen Datensatz (Regel 27)", () => {
  const validData = {
    ticker: "AAPL",
    ts: "2024-05-13T00:00:00Z",
    open: 185.435,
    high: 187.1,
    low: "184.62",
    close: 186.28,
    adj_close: 184.86,
    volume: 72044809,
    sma_200: "175.50",
    sma_50_h: 180.20,
    sma_50_l: null,
    atr_14: 3.45,
    extras: { note: "Test" },
    raw_json: { original: "data" }
  };

  const result = MarketDataDailyEntitySchema.safeParse(validData);
  
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.ticker, "AAPL");
    assertEquals(result.data.open, "185.435"); // Transformation zu String
    assertEquals(result.data.close, "186.28");
    assertEquals(result.data.sma_50_l, "0"); // null -> "0" via PriceStringSchema
    assertEquals(result.data.volume, 72044809);
  }
});

Deno.test("MarketDataDailyEntitySchema - Validiert Minimal-Datensatz", () => {
  const minimalData = {
    ticker: "MSFT",
    ts: "2024-05-13T00:00:00Z",
    open: 415.10,
    high: 417.30,
    low: 412.50,
    close: 414.50,
    adj_close: 414.50,
    volume: 15000000
  };

  const result = MarketDataDailyEntitySchema.safeParse(minimalData);
  
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.ticker, "MSFT");
    assertEquals(result.data.sma_200, undefined);
  }
});

Deno.test("MarketDataDailyEntitySchema - Schlägt bei fehlenden Pflichtfeldern fehl", () => {
  const invalidData = {
    ticker: "AAPL",
    // ts fehlt
    close: "186.28"
  };

  const result = MarketDataDailyEntitySchema.safeParse(invalidData);
  assertEquals(result.success, false);
});

Deno.test("MarketObservationEntitySchema - Validiert einen vollständigen Datensatz (Regel 27 & Default)", () => {
  const validData = {
    ticker: "AAPL",
    ts: "2024-05-13T14:00:00Z",
    open: 186.10,
    high: 187.50,
    low: 185.90,
    close: 187.20,
    rescue_sma_10: 186.50,
    chandelier_stop: null,
    // is_para_mode fehlt -> default false
  };

  const result = MarketObservationEntitySchema.safeParse(validData);
  
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.ticker, "AAPL");
    assertEquals(result.data.close, "187.2");
    assertEquals(result.data.chandelier_stop, "0"); // null -> "0"
    assertEquals(result.data.is_para_mode, false); // Default Wert
  }
});

Deno.test("MarketObservationEntitySchema - Akzeptiert explizites is_para_mode", () => {
  const data = {
    ticker: "AAPL",
    ts: "2024-05-13T14:00:00Z",
    open: 186.10,
    high: 187.50,
    low: 185.90,
    close: 187.20,
    is_para_mode: true
  };

  const result = MarketObservationEntitySchema.safeParse(data);
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.is_para_mode, true);
  }
});
