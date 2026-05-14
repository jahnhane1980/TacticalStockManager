// supabase/functions/_shared/core/repository/MarketDataRepository.ts

import { BaseRepository, type RepoResponse } from "core/repository/BaseRepository.ts";
import { 
  type MarketDataDailyEntity, 
  type MarketObservationEntity 
} from "core/models/MarketDataModels.ts";

/**
 * Fehler-Codes für das MarketDataRepository (Regel 14).
 */
export const MarketDbErrorCodes = {
  FETCH_FAILED: "MARKET_FETCH_FAILED",
  UPSERT_FAILED: "MARKET_UPSERT_FAILED",
  LATEST_TS_FAILED: "MARKET_LATEST_TS_FAILED",
  INTERNAL_ERROR: "MARKET_INTERNAL_ERROR",
} as const;

/**
 * Typ für Market-Datenbankfehler.
 */
type MarketDbErrorCode = typeof MarketDbErrorCodes[keyof typeof MarketDbErrorCodes];

/**
 * Statisches Mapping für Fehlermeldungen (Regel 14).
 */
export const MarketDbErrorMessages: Record<MarketDbErrorCode, string> = {
  [MarketDbErrorCodes.FETCH_FAILED]: "MarketDataRepository: Fehler beim Laden der Marktdaten: {}",
  [MarketDbErrorCodes.UPSERT_FAILED]: "MarketDataRepository: Fehler beim Speichern der Marktdaten: {}",
  [MarketDbErrorCodes.LATEST_TS_FAILED]: "MarketDataRepository: Fehler beim Ermitteln des letzten Zeitstempels: {}",
  [MarketDbErrorCodes.INTERNAL_ERROR]: "MarketDataRepository: Interner Datenbankfehler: {}",
};

/**
 * Repository für die Verwaltung von Marktdaten (Daily & Observation).
 */
export class MarketDataRepository extends BaseRepository {
  /**
   * Speichert tägliche Marktdaten idempotent (Regel 28).
   * 
   * @param data Die zu speichernden Datensätze.
   */
  async upsertMarketData(data: MarketDataDailyEntity[]): RepoResponse<null> {
    if (data.length === 0) return { data: null, error: null };

    const { error } = await this.supabase
      .from("market_data_daily")
      .upsert(data, { onConflict: "ticker,ts" });

    if (error) {
      return this.handleDbError(error, MarketDbErrorMessages, MarketDbErrorCodes.UPSERT_FAILED);
    }

    return { data: null, error: null };
  }

  /**
   * Speichert Beobachtungsdaten (IEX) idempotent (Regel 28).
   * 
   * @param data Die zu speichernden Datensätze.
   */
  async upsertObservations(data: MarketObservationEntity[]): RepoResponse<null> {
    if (data.length === 0) return { data: null, error: null };

    const { error } = await this.supabase
      .from("market_data_observation")
      .upsert(data, { onConflict: "ticker,ts" });

    if (error) {
      return this.handleDbError(error, MarketDbErrorMessages, MarketDbErrorCodes.UPSERT_FAILED);
    }

    return { data: null, error: null };
  }

  /**
   * Ermittelt den neuesten Zeitstempel (ts) für einen Ticker in der Tabelle 'market_data_daily'.
   * Hilfreich für Diff-Loads (Regel 28).
   * 
   * @param ticker Das Ticker-Symbol.
   * @returns Der neueste ISO-Zeitstempel oder null.
   */
  async getLatestTimestamp(ticker: string): RepoResponse<string | null> {
    const { data, error } = await this.supabase
      .from("market_data_daily")
      .select("ts")
      .eq("ticker", ticker)
      .order("ts", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return this.handleDbError(error, MarketDbErrorMessages, MarketDbErrorCodes.LATEST_TS_FAILED);
    }

    return { data: data?.ts ?? null, error: null };
  }

  /**
   * Holt den aktuellsten Marktdatensatz für einen Ticker.
   * 
   * @param ticker Das Ticker-Symbol.
   */
  async getLatestMarketData(ticker: string): RepoResponse<MarketDataDailyEntity> {
    const { data, error } = await this.supabase
      .from("market_data_daily")
      .select("*")
      .eq("ticker", ticker)
      .order("ts", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return this.handleDbError(error, MarketDbErrorMessages, MarketDbErrorCodes.FETCH_FAILED);
    }

    return { data: data as MarketDataDailyEntity | null, error: null };
  }

  /**
   * Holt einen Zeitraum von Kursdaten für einen Ticker.
   * Nützlich für die Berechnung von Indikatoren (Regel 4).
   * 
   * @param ticker Das Ticker-Symbol.
   * @param startDate Startdatum (ISO).
   * @param endDate Enddatum (ISO).
   */
  async getMarketDataRange(ticker: string, startDate: string, endDate: string): RepoResponse<MarketDataDailyEntity[]> {
    const { data, error } = await this.supabase
      .from("market_data_daily")
      .select("*")
      .eq("ticker", ticker)
      .gte("ts", startDate)
      .lte("ts", endDate)
      .order("ts", { ascending: true });

    if (error) {
      return this.handleDbError(error, MarketDbErrorMessages, MarketDbErrorCodes.FETCH_FAILED);
    }

    return { data: data ?? [], error: null };
  }
}
