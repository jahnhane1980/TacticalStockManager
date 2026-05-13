// scripts/deno/test_market_data_live.ts

import { createClient } from "supabase";
import { MarketDataRepository } from "core/repository/MarketDataRepository.ts";
import { type MarketDataDailyEntity } from "core/models/MarketDataModels.ts";

// ANSI-Farbcodes für den UI-Output
const COLOR_RED = "\x1b[31m";
const COLOR_GREEN = "\x1b[32m";
const COLOR_YELLOW = "\x1b[33m";
const COLOR_CYAN = "\x1b[36m";
const COLOR_RESET = "\x1b[0m";

/**
 * Hilfsfunktion zum sicheren Einlesen von JSON.
 */
async function readJsonSafely(path: string) {
  try {
    const text = await Deno.readTextFile(path);
    const cleanText = text.replace(/^\uFEFF/, "").trim();
    return JSON.parse(cleanText);
  } catch (error: any) {
    throw new Error(`JSON-Parsing-Fehler in ${path}: ${error.message}`);
  }
}

/**
 * Mappt Tiingo-Daten auf MarketDataDailyEntity.
 */
function mapTiingoToEntity(ticker: string, data: any[]): MarketDataDailyEntity[] {
  return data.map((item) => ({
    ticker: ticker,
    ts: item.date,
    open: String(item.open),
    high: String(item.high),
    low: String(item.low),
    close: String(item.close),
    adj_close: String(item.adjClose),
    volume: item.volume,
  }));
}

/**
 * Live-Test für das MarketDataRepository.
 */
async function main() {
  console.log(`${COLOR_CYAN}--- [MarketData Repository Live Test] Initialisierung ---${COLOR_RESET}`);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();

  if (!supabaseUrl || !supabaseKey) {
    console.error(`${COLOR_RED}❌ Fehler: SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlen.${COLOR_RESET}`);
    Deno.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const repo = new MarketDataRepository(supabase);

  try {
    // --- STUFE 1: Historische Daten (2 Year Mock) ---
    console.log(`\n${COLOR_YELLOW}Stufe 1: Lade historische Daten (AAPL_2year.json) und führe Upsert aus...${COLOR_RESET}`);
    const rawHistorical = await readJsonSafely("supabase/mocks/functions/api/AAPL_2year.json");
    const historicalEntities = mapTiingoToEntity("AAPL", rawHistorical);

    const historicalResult = await repo.upsertMarketData(historicalEntities);
    if (historicalResult.error) throw new Error(`Stufe 1 fehlgeschlagen: ${historicalResult.error.message}`);
    console.log(`${COLOR_GREEN}✅ Stufe 1 erfolgreich: ${historicalEntities.length} Datensätze gespeichert.${COLOR_RESET}`);

    // --- STUFE 2: Aktuelle Tagesdaten (Daily Mock) ---
    console.log(`\n${COLOR_YELLOW}Stufe 2: Lade aktuelle Tagesdaten (AAPL_Daily.json) und führe Upsert aus...${COLOR_RESET}`);
    const rawDaily = await readJsonSafely("supabase/mocks/functions/api/AAPL_Daily.json");
    const dailyEntities = mapTiingoToEntity("AAPL", rawDaily);

    const dailyResult = await repo.upsertMarketData(dailyEntities);
    if (dailyResult.error) throw new Error(`Stufe 2 fehlgeschlagen: ${dailyResult.error.message}`);
    console.log(`${COLOR_GREEN}✅ Stufe 2 erfolgreich: Tagesdaten gespeichert.${COLOR_RESET}`);

    // --- STUFE 3: Verifizierung des neuesten Zeitstempels ---
    console.log(`\n${COLOR_YELLOW}Stufe 3: Prüfe neuesten Zeitstempel für AAPL...${COLOR_RESET}`);
    const tsResult = await repo.getLatestTimestamp("AAPL");
    if (tsResult.error) throw new Error(`Stufe 3 fehlgeschlagen: ${tsResult.error.message}`);

    const latestTs = tsResult.data;
    console.log(`   Gefundener Zeitstempel: ${latestTs}`);

    if (latestTs && latestTs.startsWith("2026-05-08")) {
      console.log(`${COLOR_GREEN}✅ Stufe 3 erfolgreich: Zeitstempel zeigt korrekt auf den 08.05.2026.${COLOR_RESET}`);
    } else {
      throw new Error(`Stufe 3 fehlgeschlagen: Erwartete 2026-05-08, erhielt ${latestTs}`);
    }

    console.log(`\n${COLOR_CYAN}--- [Test beendet] Alle Stufen erfolgreich bestanden ---${COLOR_RESET}`);

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`\n${COLOR_RED}💥 Test abgebrochen: ${msg}${COLOR_RESET}`);
    Deno.exit(1);
  }
}

main();
