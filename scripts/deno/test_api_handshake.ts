// scripts/deno/test_api_handshake.ts

import { load } from "https://deno.land/std@0.168.0/dotenv/mod.ts";
import ky from "ky";
import { TiingoService } from "api/TiingoService.ts";
import { Trading212Service } from "api/Trading212Service.ts";

// ANSI-Farbcodes für den UI-Output (Regel 6)
const COLOR_RED = "\x1b[31m";
const COLOR_GREEN = "\x1b[32m";
const COLOR_RESET = "\x1b[0m";

/**
 * Live-Handshake Test für Tiingo und Trading212 Services.
 * Führt reale API-Abfragen durch, um die Konfiguration und Netzwerkfähigkeit zu prüfen.
 */
async function main() {
  // 1. Laden der Umgebungsvariablen (Vorgabe 2)
  const env = await load();
  const TIINGO_KEY = env["TIINGO_KEY"] || Deno.env.get("TIINGO_KEY");
  const T212_KEY = env["T212_KEY"] || Deno.env.get("T212_KEY");
  const T212_SECRET = env["T212_SECRET"] || Deno.env.get("T212_SECRET");

  if (!TIINGO_KEY || !T212_KEY || !T212_SECRET) {
    console.error(`${COLOR_RED}❌ Fehler: Umgebungsvariablen TIINGO_KEY, T212_KEY oder T212_SECRET fehlen.${COLOR_RESET}`);
    Deno.exit(1);
  }

  // 2. Instanziierung der Services (Vorgabe 3)
  const tiingoService = new TiingoService(TIINGO_KEY, "https://api.tiingo.com/", ky);
  const t212Service = new Trading212Service(T212_KEY, T212_SECRET, "https://live.trading212.com/api/v0/", ky);

  console.log("🚀 Starte API-Handshake Test (V14.0 Compliance Mode)...");

  // 3. Tiingo API Test
  console.log("\n--- [Tiingo API] Teste getDaily('AAPL') ---");
  const tiingoResult = await tiingoService.getDaily("AAPL");
  
  if (tiingoResult.error) {
    console.error(`${COLOR_RED}❌ Tiingo Fehler [${tiingoResult.error.code}]: ${tiingoResult.error.message}${COLOR_RESET}`);
  } else if (tiingoResult.data) {
    console.log(`${COLOR_GREEN}✅ Tiingo Erfolg! Erhaltene Datensätze: ${tiingoResult.data.length}${COLOR_RESET}`);
    if (tiingoResult.data.length > 0) {
      const latest = tiingoResult.data[0];
      console.log(`   Letzter Kurs: ${latest.close} (Datum: ${latest.date})`);
    }
  }

  // 4. Trading 212 API Test (Vorgabe 4, 5 & 6)
  console.log("\n--- [Trading 212 API] Teste getPortfolio() ---");
  const t212Result = await t212Service.getPortfolio();
  
  if (t212Result.error) {
    console.error(`${COLOR_RED}❌ Trading 212 Fehler [${t212Result.error.code}]: ${t212Result.error.message}${COLOR_RESET}`);
  } else if (t212Result.data) {
    console.log(`${COLOR_GREEN}✅ Trading 212 Erfolg! Positionen im Portfolio: ${t212Result.data.length}${COLOR_RESET}`);
    
    // Anzeige der ersten 3 Ticker (Vorgabe 5)
    t212Result.data.slice(0, 3).forEach((pos) => {
      console.log(`   - ${pos.instrument.ticker}: ${pos.quantity} @ ${pos.currentPrice} ${pos.instrument.currency}`);
    });
    
    if (t212Result.data.length > 3) {
      console.log(`   ... und ${t212Result.data.length - 3} weitere Positionen.`);
    }
  }

  console.log("\n✨ API-Handshake Test abgeschlossen.");
}

// Globales Error-Handling für den Skript-Lauf (Regel 1)
main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unbekannter fataler Fehler";
  console.error(`${COLOR_RED}\n💥 Fataler Fehler während des Handshakes: ${message}${COLOR_RESET}`);
  Deno.exit(1);
});
