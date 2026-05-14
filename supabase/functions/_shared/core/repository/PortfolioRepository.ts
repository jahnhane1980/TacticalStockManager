// supabase/functions/_shared/core/repository/PortfolioRepository.ts

import { BaseRepository, type RepoResponse } from "core/repository/BaseRepository.ts";
import { PortfolioEntitySchema, type PortfolioEntity } from "core/models/PortfolioModels.ts";

/**
 * Fehler-Codes für das PortfolioRepository (Regel 14).
 */
export const PortfolioDbErrorCodes = {
  FETCH_TICKERS_FAILED: "PORTFOLIO_FETCH_TICKERS_FAILED",
  UPSERT_FAILED: "PORTFOLIO_UPSERT_FAILED",
  DELETE_FAILED: "PORTFOLIO_DELETE_FAILED",
  DEACTIVATE_FAILED: "PORTFOLIO_DEACTIVATE_FAILED",
  SYNC_FETCH_FAILED: "PORTFOLIO_SYNC_FETCH_FAILED",
  UNLOCK_FAILED: "PORTFOLIO_UNLOCK_FAILED",
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
  [PortfolioDbErrorCodes.DEACTIVATE_FAILED]: "PortfolioRepository: Fehler beim Deaktivieren der Positionen: {}",
  [PortfolioDbErrorCodes.SYNC_FETCH_FAILED]: "PortfolioRepository: Fehler beim Abrufen der Sync-Ticker: {}",
  [PortfolioDbErrorCodes.UNLOCK_FAILED]: "PortfolioRepository: Fehler beim Entsperren des Tickers: {}",
  [PortfolioDbErrorCodes.INTERNAL_ERROR]: "PortfolioRepository: Interner Datenbankfehler: {}",
};

/**
 * Repository für die Verwaltung von Portfolio-Snapshots in der Datenbank.
 */
export class PortfolioRepository extends BaseRepository {
  /**
   * Holt alle bereits gespeicherten Ticker aus der Datenbank.
   * Fragt die Tabelle 'portfolio_snapshots' ab und verknüpft diese mit 'monitoring_config'.
   * 
   * @param onlyActive Wenn true (Standard), werden nur aktive Ticker zurückgegeben.
   * @returns Eine Liste von Objekten mit Ticker und Aktivitätsstatus.
   */
  async getStoredTickers(onlyActive: boolean = true): RepoResponse<{ 
    ticker: string; 
    is_active: boolean;
    last_historical_sync: string | null;
    last_observation_sync: string | null;
    locked_until: string | null;
  }[]> {
    let query = this.supabase
      .from("portfolio_snapshots")
      .select(`
        ticker, 
        monitoring_config!inner(
          is_active, 
          last_historical_sync, 
          last_observation_sync, 
          locked_until
        )
      `);

    if (onlyActive) {
      query = query.eq("monitoring_config.is_active", true);
    }

    const { data, error } = await query;

    if (error) {
      return this.handleDbError(error, PortfolioDbErrorMessages, PortfolioDbErrorCodes.FETCH_TICKERS_FAILED);
    }

    const results = data?.map((row: any) => ({
      ticker: row.ticker as string,
      is_active: (row.monitoring_config as any)?.is_active as boolean,
      last_historical_sync: (row.monitoring_config as any)?.last_historical_sync as string | null,
      last_observation_sync: (row.monitoring_config as any)?.last_observation_sync as string | null,
      locked_until: (row.monitoring_config as any)?.locked_until as string | null,
    })) ?? [];

    return { data: results, error: null };
  }

  /**
   * Sucht fällige Ticker für die Synchronisation und sperrt diese sofort.
   * Ticker sind fällig, wenn sie aktiv sind und locked_until leer oder in der Vergangenheit liegt.
   * 
   * @param limit Maximale Anzahl der zu synchronisierenden Ticker.
   */
  async getTickersForSync(limit: number): RepoResponse<string[]> {
    const now = new Date().toISOString();
    
    // 1. Suche nach fälligen Tickern
    const { data, error: fetchError } = await this.supabase
      .from("monitoring_config")
      .select("ticker")
      .eq("is_active", true)
      .or(`locked_until.is.null,locked_until.lt.${now}`)
      .order("last_observation_sync", { ascending: true, nullsFirst: true })
      .limit(limit);

    if (fetchError) {
      return this.handleDbError(fetchError, PortfolioDbErrorMessages, PortfolioDbErrorCodes.SYNC_FETCH_FAILED);
    }

    if (!data || data.length === 0) {
      return { data: [], error: null };
    }

    const tickers = data.map(d => d.ticker);
    const lockUntil = new Date(Date.now() + 3 * 60 * 1000).toISOString();

    // 2. Sperren der Ticker (locked_until = NOW + 3 Min)
    const { error: lockError } = await this.supabase
      .from("monitoring_config")
      .update({ locked_until: lockUntil })
      .in("ticker", tickers);

    if (lockError) {
      return this.handleDbError(lockError, PortfolioDbErrorMessages, PortfolioDbErrorCodes.SYNC_FETCH_FAILED);
    }

    return { data: tickers, error: null };
  }

  /**
   * Entsperrt einen Ticker und aktualisiert optional den Sync-Zeitstempel.
   * 
   * @param ticker Das Ticker-Symbol.
   * @param isSuccess Wenn true, wird last_observation_sync auf NOW() gesetzt.
   */
  async unlockTicker(ticker: string, isSuccess: boolean): RepoResponse<null> {
    const updateData: any = { locked_until: null };
    if (isSuccess) {
      updateData.last_observation_sync = new Date().toISOString();
    }

    const { error } = await this.supabase
      .from("monitoring_config")
      .update(updateData)
      .eq("ticker", ticker);

    if (error) {
      return this.handleDbError(error, PortfolioDbErrorMessages, PortfolioDbErrorCodes.UNLOCK_FAILED);
    }

    return { data: null, error: null };
  }

  /**
   * Führt einen Upsert für Portfolio-Positionen durch.
   * Aktualisiert idempotent sowohl 'portfolio_snapshots' als auch 'monitoring_config' (Regel 28).
   * 
   * @param positions Die zu speichernden Positionen.
   */
  async upsertPortfolioPositions(positions: PortfolioEntity[]): RepoResponse<null> {
    if (positions.length === 0) {
      return { data: null, error: null };
    }

    // 1. Daten für monitoring_config extrahieren und zuerst speichern
    const configs = positions.map(({ ticker, is_active, frequency_id }) => ({
      ticker,
      is_active,
      frequency_id,
    }));

    const { error: configError } = await this.supabase
      .from("monitoring_config")
      .upsert(configs, { onConflict: "ticker" });

    if (configError) {
      return this.handleDbError(configError, PortfolioDbErrorMessages, PortfolioDbErrorCodes.UPSERT_FAILED);
    }

    // 2. Daten für portfolio_snapshots extrahieren und erst danach speichern
    const snapshots = positions.map(({ is_active, frequency_id, ...rest }) => rest);

    const { error: snapshotError } = await this.supabase
      .from("portfolio_snapshots")
      .upsert(snapshots, { onConflict: "ticker" });

    if (snapshotError) {
      return this.handleDbError(snapshotError, PortfolioDbErrorMessages, PortfolioDbErrorCodes.UPSERT_FAILED);
    }

    return { data: null, error: null };
  }

  /**
   * Deaktiviert die Einträge für die übergebenen Ticker (setzt is_active=false und quantity=0).
   * Ersetzt deletePositions zur Erhaltung der Historie.
   * 
   * @param tickers Liste der zu deaktivierenden Ticker.
   */
  async deactivatePositions(tickers: string[]): RepoResponse<null> {
    if (tickers.length === 0) {
      return { data: null, error: null };
    }

    const [snapRes, configRes] = await Promise.all([
      this.supabase.from("portfolio_snapshots").update({ quantity: "0" }).in("ticker", tickers),
      this.supabase.from("monitoring_config").update({ is_active: false }).in("ticker", tickers),
    ]);

    const error = snapRes.error || configRes.error;
    if (error) {
      return this.handleDbError(error, PortfolioDbErrorMessages, PortfolioDbErrorCodes.DEACTIVATE_FAILED);
    }

    return { data: null, error: null };
  }
}
