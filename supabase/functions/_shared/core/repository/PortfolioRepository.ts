// supabase/functions/_shared/core/repository/PortfolioRepository.ts

import { z } from "zod";
import { BaseRepository, type RepoResponse } from "core/repository/BaseRepository.ts";
import { PriceStringSchema } from "core/models/ZodUtils.ts";

/**
 * Zod-Schema für die Portfolio-Entität basierend auf der Tabelle 'portfolio_snapshots'.
 * Nutzt PriceStringSchema für alle finanziellen Werte gemäß Regel 27.
 */
export const PortfolioEntitySchema = z.object({
  ticker: z.string(),
  name: z.string().nullish(),
  isin: z.string().nullish(),
  quantity: PriceStringSchema,
  average_price_paid: PriceStringSchema,
  current_price: PriceStringSchema,
  total_cost_eur: PriceStringSchema,
  current_value_eur: PriceStringSchema,
  fx_impact: PriceStringSchema,
  last_sync: z.string().nullish(),
  raw_snapshot: z.unknown().nullish(),
});

/**
 * Typ für die Portfolio-Entität.
 */
export type PortfolioEntity = z.infer<typeof PortfolioEntitySchema>;

/**
 * Fehler-Codes für das PortfolioRepository (Regel 14).
 */
export const PortfolioDbErrorCodes = {
  FETCH_TICKERS_FAILED: "PORTFOLIO_FETCH_TICKERS_FAILED",
  UPSERT_FAILED: "PORTFOLIO_UPSERT_FAILED",
  DELETE_FAILED: "PORTFOLIO_DELETE_FAILED",
  INTERNAL_ERROR: "PORTFOLIO_INTERNAL_ERROR",
} as const;

/**
 * Typ für Portfolio-Datenbankfehler.
 */
type PortfolioDbErrorCode = typeof PortfolioDbErrorCodes[keyof typeof PortfolioDbErrorCodes];

/**
 * Statisches Mapping für Fehlermeldungen (Regel 14).
 */
export const PortfolioDbErrorMessages: Record<PortfolioDbErrorCode, string> = {
  [PortfolioDbErrorCodes.FETCH_TICKERS_FAILED]: "PortfolioRepository: Fehler beim Laden der Ticker: {}",
  [PortfolioDbErrorCodes.UPSERT_FAILED]: "PortfolioRepository: Fehler beim Upsert der Positionen: {}",
  [PortfolioDbErrorCodes.DELETE_FAILED]: "PortfolioRepository: Fehler beim Löschen der Positionen: {}",
  [PortfolioDbErrorCodes.INTERNAL_ERROR]: "PortfolioRepository: Interner Datenbankfehler: {}",
};

/**
 * Repository für die Verwaltung von Portfolio-Snapshots in der Datenbank.
 */
export class PortfolioRepository extends BaseRepository {
  /**
   * Holt alle bereits gespeicherten Ticker aus der Datenbank.
   * 
   * @returns Eine Liste der Ticker-Strings.
   */
  async getStoredTickers(): RepoResponse<string[]> {
    const { data, error } = await this.supabase
      .from("portfolio_snapshots")
      .select("ticker");

    if (error) {
      return this.handleDbError(error, PortfolioDbErrorMessages, PortfolioDbErrorCodes.FETCH_TICKERS_FAILED);
    }

    const tickers = data?.map((row: { ticker: string }) => row.ticker) ?? [];
    return { data: tickers, error: null };
  }

  /**
   * Führt einen Upsert für Portfolio-Positionen durch.
   * Nutzt 'onConflict: ticker' zur Sicherstellung der Idempotenz (Regel 28).
   * 
   * @param positions Die zu speichernden Positionen.
   */
  async upsertPortfolioPositions(positions: PortfolioEntity[]): RepoResponse<null> {
    const { error } = await this.supabase
      .from("portfolio_snapshots")
      .upsert(positions, { onConflict: "ticker" });

    if (error) {
      return this.handleDbError(error, PortfolioDbErrorMessages, PortfolioDbErrorCodes.UPSERT_FAILED);
    }

    return { data: null, error: null };
  }

  /**
   * Löscht die Einträge für die übergebenen Ticker.
   * 
   * @param tickers Liste der zu löschenden Ticker.
   */
  async deletePositions(tickers: string[]): RepoResponse<null> {
    if (tickers.length === 0) {
      return { data: null, error: null };
    }

    const { error } = await this.supabase
      .from("portfolio_snapshots")
      .delete()
      .in("ticker", tickers);

    if (error) {
      return this.handleDbError(error, PortfolioDbErrorMessages, PortfolioDbErrorCodes.DELETE_FAILED);
    }

    return { data: null, error: null };
  }
}
