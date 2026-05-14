// supabase/functions/sync_market_data/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "supabase";
import { PortfolioRepository } from "core/repository/PortfolioRepository.ts";
import { MarketDataRepository } from "core/repository/MarketDataRepository.ts";
import { MarketSyncEngine } from "core/engine/MarketSyncEngine.ts";
import { HttpStatus } from "core/network/HttpStatus.ts";

/**
 * Edge Function zum Triggern der Marktdaten-Synchronisation.
 * Wird typischerweise via GitHub Action oder Cron-Job aufgerufen.
 */
serve(async (_req) => {
  try {
    // 1. Initialisierung (Regel 1)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 2. Repositories und Engine instanziieren
    const portfolioRepo = new PortfolioRepository(supabase);
    const marketRepo = new MarketDataRepository(supabase);
    const syncEngine = new MarketSyncEngine(portfolioRepo, marketRepo);

    // 3. Batch-Verarbeitung starten (Limit: 5 Ticker pro Aufruf)
    console.log("Edge Function: Starte sync_market_data...");
    const result = await syncEngine.processNextBatch(5);

    // 4. Erfolg zurückgeben
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Market sync batch processed.",
        processed: result.processed,
        errors: result.errors
      }),
      { 
        headers: { "Content-Type": "application/json" },
        status: HttpStatus.OK 
      }
    );

  } catch (error: any) {
    console.error(`Edge Function Error: ${error.message}`);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { "Content-Type": "application/json" },
        status: HttpStatus.SERVER_ERROR 
      }
    );
  }
});
