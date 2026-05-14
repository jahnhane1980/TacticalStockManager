// supabase/tests/core/engine/MarketSyncEngine_test.ts

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { PortfolioRepository } from "core/repository/PortfolioRepository.ts";
import { MarketDataRepository } from "core/repository/MarketDataRepository.ts";
import { MarketSyncEngine } from "core/engine/MarketSyncEngine.ts";

/**
 * Erstellt einen Mock für das PortfolioRepository.
 * Erweitert um Fehler-Simulationen für neue Tests.
 */
const createPortfolioRepoMock = (options: { 
  tickers?: string[], 
  fetchError?: any,
  throwOnUnlock?: boolean 
} = {}) => {
  const capturedUnlocks: { ticker: string, isSuccess: boolean }[] = [];
  let getTickersCalled = false;
  let unlockCount = 0;
  
  const tickers = options.tickers || [];
  
  return {
    getTickersForSync: async (limit: number) => {
      getTickersCalled = true;
      if (options.fetchError) {
        return { data: null, error: options.fetchError };
      }
      return { data: tickers.slice(0, limit), error: null };
    },
    unlockTicker: async (ticker: string, isSuccess: boolean) => {
      unlockCount++;
      capturedUnlocks.push({ ticker, isSuccess });
      
      if (options.throwOnUnlock && unlockCount === 1) {
        throw new Error("Simulated Crash");
      }
      
      return { data: null, error: null };
    },
    getCapturedUnlocks: () => capturedUnlocks,
    isGetTickersCalled: () => getTickersCalled
  } as unknown as PortfolioRepository & { getCapturedUnlocks: () => any[], isGetTickersCalled: () => boolean };
};

/**
 * Erstellt einen Mock für das MarketDataRepository.
 */
const createMarketRepoMock = () => {
  return {} as unknown as MarketDataRepository;
};

Deno.test("MarketSyncEngine - Erfolgreicher Durchlauf", async () => {
  const portfolioRepo = createPortfolioRepoMock({ tickers: ["AAPL", "TSLA"] });
  const marketRepo = createMarketRepoMock();
  const engine = new MarketSyncEngine(portfolioRepo, marketRepo);

  const result = await engine.processNextBatch(5);

  assertEquals(result.processed, ["AAPL", "TSLA"]);
  assertEquals((portfolioRepo as any).isGetTickersCalled(), true);
  
  const unlocks = (portfolioRepo as any).getCapturedUnlocks();
  assertEquals(unlocks.length, 2);
  assertEquals(unlocks[0], { ticker: "AAPL", isSuccess: true });
  assertEquals(unlocks[1], { ticker: "TSLA", isSuccess: true });
});

Deno.test("MarketSyncEngine - Fehler beim Abruf der Ticker", async () => {
  const portfolioRepo = createPortfolioRepoMock({ 
    fetchError: { message: "Database Down", code: "500" } 
  });
  const marketRepo = createMarketRepoMock();
  const engine = new MarketSyncEngine(portfolioRepo, marketRepo);

  const result = await engine.processNextBatch(5);

  assertEquals(result.processed.length, 0);
  assertEquals(result.errors, ["Database Down"]);
  assertEquals((portfolioRepo as any).getCapturedUnlocks().length, 0);
});

Deno.test("MarketSyncEngine - Fehler im Verarbeitung-Loop (Catch-Block)", async () => {
  // Wir mocken einen Ticker und lassen unlockTicker beim ersten Mal abstürzen
  const portfolioRepo = createPortfolioRepoMock({ 
    tickers: ["FAIL"],
    throwOnUnlock: true 
  });
  const marketRepo = createMarketRepoMock();
  const engine = new MarketSyncEngine(portfolioRepo, marketRepo);

  const result = await engine.processNextBatch(1);

  // Erster Aufruf wirft Error, Catch-Block wird ausgeführt
  assertEquals(result.processed.length, 0);
  assertEquals(result.errors, ["FAIL: Simulated Crash"]);
  
  const unlocks = (portfolioRepo as any).getCapturedUnlocks();
  // Erwartet: 
  // 1. unlockTicker(FAIL, true) -> Throws
  // 2. unlockTicker(FAIL, false) -> In Catch-Block (Erfolg)
  assertEquals(unlocks.length, 2);
  assertEquals(unlocks[0], { ticker: "FAIL", isSuccess: true });
  assertEquals(unlocks[1], { ticker: "FAIL", isSuccess: false });
});

Deno.test("MarketSyncEngine - Timeout Early Exit", async () => {
  const portfolioRepo = createPortfolioRepoMock({ tickers: ["T1", "T2", "T3"] });
  const marketRepo = createMarketRepoMock();
  const engine = new MarketSyncEngine(portfolioRepo, marketRepo);

  // Mock performance.now
  const originalNow = performance.now;
  let callCount = 0;
  
  // Wir überschreiben performance.now auf globaler Ebene für diesen Test
  globalThis.performance.now = () => {
    callCount++;
    if (callCount === 1) return 0;      // Startzeit (startTime)
    if (callCount === 2) return 500;    // Check für T1 (500ms vergangen)
    if (callCount === 3) return 110001; // Check für T2 (110.001ms vergangen) -> Timeout!
    return 200000;
  };

  try {
    const result = await engine.processNextBatch(5);

    // T1 sollte noch verarbeitet sein, da der Check VOR der Verarbeitung von T2 stattfindet
    assertEquals(result.processed, ["T1"]);
    const unlocks = (portfolioRepo as any).getCapturedUnlocks();
    assertEquals(unlocks.length, 1);
    assertEquals(unlocks[0].ticker, "T1");
  } finally {
    // Originales performance.now wiederherstellen
    globalThis.performance.now = originalNow;
  }
});
