// supabase/functions/_shared/core/engine/MarketSyncEngine.ts

import { PortfolioRepository } from "core/repository/PortfolioRepository.ts";
import { MarketDataRepository } from "core/repository/MarketDataRepository.ts";

/**
 * Die MarketSyncEngine koordiniert die Synchronisation von Marktdaten für das Portfolio.
 * Sie nutzt das Rolling-Sync-Verfahren mit Lock-Mechanismus (Regel 1).
 */
export class MarketSyncEngine {
  private readonly portfolioRepo: PortfolioRepository;
  private readonly marketRepo: MarketDataRepository;

  /**
   * @param portfolioRepo Repository für Portfolio- und Konfigurationsdaten.
   * @param marketRepo Repository für Marktdaten (Daily/Observation).
   */
  constructor(portfolioRepo: PortfolioRepository, marketRepo: MarketDataRepository) {
    this.portfolioRepo = portfolioRepo;
    this.marketRepo = marketRepo;
  }

  /**
   * Verarbeitet den nächsten Batch fälliger Ticker.
   * Beachtet ein Zeitlimit, um Timeouts in Cloud-Functions zu vermeiden.
   * 
   * @param limit Maximale Anzahl der Ticker pro Batch (Standard: 5).
   */
  async processNextBatch(limit: number = 5): Promise<{ processed: string[]; errors: string[] }> {
    const startTime = performance.now();
    const processed: string[] = [];
    const errors: string[] = [];

    // 1. Ticker für Sync abrufen und locken
    const { data: tickers, error: fetchError } = await this.portfolioRepo.getTickersForSync(limit);

    if (fetchError || !tickers) {
      console.error(`MarketSyncEngine: Fehler beim Abrufen der Ticker: ${fetchError?.message}`);
      return { processed, errors: [fetchError?.message || "Unbekannter Fehler beim Fetch"] };
    }

    console.log(`MarketSyncEngine: Starte Batch-Verarbeitung für ${tickers.length} Ticker.`);

    // 2. Iteration über die Ticker
    for (const ticker of tickers) {
      // Early Exit Check: Max 110 Sekunden Laufzeit (Regel: Cloud Function Limit beachten)
      if (performance.now() - startTime > 110000) {
        console.warn("MarketSyncEngine: Zeitlimit fast erreicht (Early Exit).");
        break;
      }

      try {
        console.log(`MarketSyncEngine: Synchronisiere Ticker [${ticker}]...`);

        // TODO: TiingoService aufrufen und Marktdaten abrufen
        // const marketData = await this.tiingoService.fetchIexData(ticker);

        // TODO: Indikatoren berechnen (SMA, ATR, Chandelier Stop)
        // const enrichedData = this.indicatorEngine.calculate(marketData);

        // TODO: Daten im MarketRepo speichern
        // await this.marketRepo.upsertObservations([enrichedData]);

        // 3. Unlock: Erfolg (Sync-Zeitstempel setzen)
        const { error: unlockError } = await this.portfolioRepo.unlockTicker(ticker, true);
        
        if (unlockError) {
          console.error(`MarketSyncEngine: Fehler beim Unlock von ${ticker}: ${unlockError.message}`);
          errors.push(`${ticker}: Unlock fehlgeschlagen`);
        } else {
          processed.push(ticker);
        }

      } catch (err: any) {
        console.error(`MarketSyncEngine: Unerwarteter Fehler bei Ticker ${ticker}: ${err.message}`);
        errors.push(`${ticker}: ${err.message}`);

        // Unlock auch im Fehlerfall (ohne neuen Sync-Zeitstempel, um Wiederholung zu ermöglichen)
        await this.portfolioRepo.unlockTicker(ticker, false);
      }
    }

    console.log(`MarketSyncEngine: Batch beendet. Erfolgreich: ${processed.length}, Fehler: ${errors.length}`);
    return { processed, errors };
  }
}
