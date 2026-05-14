// scripts/deno/test_portfolio_live.ts

import { createClient } from "supabase";
import { PortfolioRepository } from "core/repository/PortfolioRepository.ts";

// ANSI-Farbcodes für den UI-Output
const COLOR_RED = "\x1b[31m";
const COLOR_GREEN = "\x1b[32m";
const COLOR_YELLOW = "\x1b[33m";
const COLOR_CYAN = "\x1b[36m";
const COLOR_RESET = "\x1b[0m";

/**
 * Hilfsfunktion zum sicheren Einlesen von JSON.
 * Entfernt unsichtbare BOM-Zeichen (Byte Order Mark) und trimmt Leerzeichen.
 */
async function readJsonSafely(path: string) {
  try {
    const text = await Deno.readTextFile(path);
    // Entfernt das unter Windows häufige BOM (\ufeff) und trimmt den String
    const cleanText = text.replace(/^\uFEFF/, "").trim();
    return JSON.parse(cleanText);
  } catch (error: any) {
    throw new Error(`JSON-Parsing-Fehler in ${path}: ${error.message}`);
  }
}

/**
 * Live-Test für das PortfolioRepository (V14.0).
 * Validiert Real-Data Upserts, Idempotenz (Regel 28) und Error-Handling (Regel 14).
 */
async function main() {
  console.log(`${COLOR_CYAN}--- [Repository Live Test] Initialisierung ---${COLOR_RESET}`);

  // 1. Setup: Umgebungsvariablen und Client
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();

  if (!supabaseUrl || !supabaseKey) {
    console.error(`${COLOR_RED}❌ Fehler: SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlen.${COLOR_RESET}`);
    Deno.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const repo = new PortfolioRepository(supabase);

  // Pfad zum Mock-File
  const MOCK_PATH = "supabase/mocks/functions/api/Trading212_portfolio.json";
  
  try {
    // --- STUFE 1: Real-Data Upsert (Regel 27) ---
    console.log(`\n${COLOR_YELLOW}Stufe 1: Lade Realdaten und führe Upsert aus...${COLOR_RESET}`);
    
    // Nutzt die neue, sichere Einlese-Funktion statt JSON.parse(Deno.readTextFile)
    const rawData = await readJsonSafely(MOCK_PATH);
    
    if (!Array.isArray(rawData)) throw new Error("Mock-Daten sind kein Array.");

    // Mapping auf das Entity-Schema (Financial Precision - Regel 27)
    const testPositions = rawData.slice(0, 2).map((item: any) => ({
      ticker: item.instrument.ticker,
      name: item.instrument.name,
      isin: item.instrument.isin,
      quantity: String(item.quantity),
      average_price_paid: String(item.averagePricePaid),
      current_price: String(item.currentPrice),
      total_cost_eur: String(item.walletImpact.totalCost),
      current_value_eur: String(item.walletImpact.currentValue),
      fx_impact: String(item.walletImpact.fxImpact || 0),
      is_active: true,
      frequency_id: "daily",
      last_sync: new Date().toISOString(),
      last_observation_sync: new Date(Date.now() - 3600000).toISOString(), // 1 Stunde alt
      locked_until: null,
      raw_snapshot: item
    }));

    const upsertResult = await repo.upsertPortfolioPositions(testPositions);
    if (upsertResult.error) throw new Error(`Upsert fehlgeschlagen: ${upsertResult.error.message}`);
    console.log(`${COLOR_GREEN}✅ Stufe 1 erfolgreich: ${testPositions.length} Positionen gespeichert.${COLOR_RESET}`);

    // --- STUFE 2: Idempotenz-Check (Regel 28) ---
    console.log(`\n${COLOR_YELLOW}Stufe 2: Idempotenz-Check (Update bestehender Ticker)...${COLOR_RESET}`);
    const updatedPositions = [...testPositions];
    updatedPositions[0].current_price = "9999.99"; // Test-Änderung für Idempotenz-Beweis

    const idemResult = await repo.upsertPortfolioPositions(updatedPositions);
    if (idemResult.error) throw new Error(`Idempotenz-Upsert fehlgeschlagen: ${idemResult.error.message}`);

    const { data: storedTickers, error: fetchError } = await repo.getStoredTickers();
    if (fetchError) throw new Error(`Fehler beim Abrufen der Ticker in Stufe 2: ${fetchError.message}`);

    const count = storedTickers?.filter(t => testPositions.some(tp => tp.ticker === t.ticker)).length ?? 0;
    
    if (count !== testPositions.length) {
      throw new Error(`Idempotenz-Verletzung: Erwartete ${testPositions.length} Einträge, fand ${count}.`);
    }
    console.log(`${COLOR_GREEN}✅ Stufe 2 erfolgreich: Keine Dubletten erzeugt, Idempotenz gewahrt.${COLOR_RESET}`);

    // --- STUFE 3: Sabotage / Error Handling (Regel 14) ---
    console.log(`\n${COLOR_YELLOW}Stufe 3: Provokation eines DB-Fehlers (Constraint Violation)...${COLOR_RESET}`);
    const sabotageData = [{ ...testPositions[0], ticker: null }] as any;
    const sabotageResult = await repo.upsertPortfolioPositions(sabotageData);

    if (sabotageResult.error) {
      console.log(`${COLOR_GREEN}✅ Stufe 3 erfolgreich: Fehler korrekt abgefangen.${COLOR_RESET}`);
      console.log(`   Code: ${sabotageResult.error.code}`);
    } else {
      throw new Error("Sabotage fehlgeschlagen: DB hätte Fehler werfen müssen.");
    }

    // --- STUFE 4: Verifizierung der Deaktivierung (Soft-Delete) ---
    console.log(`\n${COLOR_YELLOW}Stufe 4: Verifizierung der Deaktivierung (Soft-Delete)...${COLOR_RESET}`);
    const tickersToDeactivate = testPositions.map(p => p.ticker);
    const deactivateResult = await repo.deactivatePositions(tickersToDeactivate);
    if (deactivateResult.error) throw new Error(`Deaktivierung fehlgeschlagen: ${deactivateResult.error.message}`);

    const { data: activeTickers } = await repo.getStoredTickers(true); // Default ist true
    const remainingCount = activeTickers?.filter(t => tickersToDeactivate.includes(t.ticker)).length;

    if (remainingCount && remainingCount > 0) {
      throw new Error(`Soft-Delete fehlgeschlagen: ${remainingCount} deaktvierte Ticker sind noch in der aktiven Liste enthalten.`);
    }
    console.log(`${COLOR_GREEN}✅ Stufe 4 erfolgreich: Ticker deaktiviert und nicht mehr im aktiven Bestand gelistet.${COLOR_RESET}`);

    // --- STUFE 5: Rolling Sync Lock-Test ---
    console.log(`\n${COLOR_YELLOW}Stufe 5: Rolling Sync Lock-Test...${COLOR_RESET}`);
    // Wir aktivieren die Ticker wieder, damit sie für den Sync gefunden werden können
    const reactivateConfigs = testPositions.map(({ ticker, frequency_id }) => ({
      ticker,
      is_active: true,
      frequency_id,
      locked_until: null // Lock explizit entfernen
    }));
    const { error: reactivateError } = await supabase.from("monitoring_config").upsert(reactivateConfigs, { onConflict: "ticker" });
    if (reactivateError) throw new Error(`Reaktivierung fehlgeschlagen: ${reactivateError.message}`);

    const syncResult = await repo.getTickersForSync(2);
    if (syncResult.error) throw new Error(`getTickersForSync fehlgeschlagen: ${syncResult.error.message}`);
    
    const syncedTickers = syncResult.data || [];
    if (syncedTickers.length === 0) {
      throw new Error(`Sync-Fehler: Keine Ticker zurückgegeben.`);
    }
    if (syncedTickers.length > 2) {
      throw new Error(`Sync-Fehler: Zu viele Ticker zurückgegeben (${syncedTickers.length})`);
    }
    
    console.log(`${COLOR_GREEN}✅ Stufe 5 erfolgreich: Ticker für Sync geladen und gelockt.${COLOR_RESET}`);

    console.log(`\n${COLOR_CYAN}--- [Test beendet] Alle Stufen erfolgreich bestanden ---${COLOR_RESET}`);

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`\n${COLOR_RED}💥 Test abgebrochen: ${msg}${COLOR_RESET}`);
    Deno.exit(1);
  }
}

main();