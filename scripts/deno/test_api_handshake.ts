// scripts/test_api_handshake.ts

import { load } from "https://deno.land/std@0.168.0/dotenv/mod.ts";
import ky from "ky";
import { TiingoService } from "api/TiingoService.ts";
import { Trading212Service } from "api/Trading212Service.ts";

/**
 * Live-Handshake Test für Tiingo und Trading212 Services.
 * Führt reale API-Abfragen durch, um die Konfiguration und Netzwerkfähigkeit zu prüfen.
 */
async function main() {
  // 1. Laden der Umgebungsvariablen
  const env = await load();
  const TIINGO_KEY = env["TIINGO_KEY"] || Deno.env.get("TIINGO_KEY");
  const T212_KEY = env["T212_KEY"] || Deno.env.get("T212_KEY");
  const T212_SECRET = env["T212_SECRET"] || Deno.env.get("T212_SECRET");

  if (!TIINGO_KEY || !T212_KEY || !T212_SECRET) {
    console.error("❌ Fehler: Umgebungsvariablen TIINGO_KEY, T212_KEY oder T212_SECRET fehlen.");
    Deno.exit(1);
  }

  // 2. Instanziierung der Services
  const tiingoService = new TiingoService(TIINGO_KEY, "https://api.tiingo.com/", ky);
  const t212Service = new Trading212Service(T212_KEY, T212_SECRET, "https://live.trading212.com/api/v0/", ky);

  console.log("🚀 Starte API-Handshake Test (V14.0 Compliance Mode)...");

  // 3. Tiingo API Test
  console.log("\n--- [Tiingo API] Teste getDaily('AAPL') ---");
  const tiingoResult = await tiingoService.getDaily("AAPL");
  
  if (tiingoResult.error) {
    console.error(`❌ Tiingo Fehler [${tiingoResult.error.code}]: ${tiingoResult.error.message}`);
  } else if (tiingoResult.data) {
    console.log(`✅ Tiingo Erfolg! Erhaltene Datensätze: ${tiingoResult.data.length}`);
    if (tiingoResult.data.length > 0) {
      const latest = tiingoResult.data[0];
      console.log(`   Letzter Kurs: ${latest.close} (Datum: ${latest.date})`);
    }
  }

  // 4. Trading 212 API Test
  console.log("\n--- [Trading 212 API] Teste getPortfolio() ---");
  const t212Result = await t212Service.getPortfolio();
  
  if (t212Result.error) {
    console.error(`❌ Trading 212 Fehler [${t212Result.error.code}]: ${t212Result.error.message}`);
  } else if (t212Result.data) {
    console.log(`✅ Trading 212 Erfolg! Positionen im Portfolio: ${t212Result.data.length}`);
    t212Result.data.slice(0, 5).forEach((pos) => {
      console.log(`   - ${pos.instrument.ticker}: ${pos.quantity} @ ${pos.currentPrice} ${pos.instrument.currency}`);
    });
    if (t212Result.data.length > 5) {
      console.log(`   ... und ${t212Result.data.length - 5} weitere Positionen.`);
    }
  }

  console.log("\n✨ API-Handshake Test abgeschlossen.");
}

// Globales Error-Handling für den Skript-Lauf (Regel 1)
main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unbekannter fataler Fehler";
  console.error(`\n💥 Fataler Fehler während des Handshakes: ${message}`);
  Deno.exit(1);
});
