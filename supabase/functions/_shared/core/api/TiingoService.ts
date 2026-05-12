// functions/_shared/core/api/TiingoService.ts

import ky from "ky";
import { HttpStatus } from "network/HttpStatus.ts"; // Viel sauberer!
/**
 * Interface basierend auf dem gelieferten AAPL_1hour.json Beispiel.
 */
export interface TiingoPriceResponse {
  date: string;
  close: number;
  high: number;
  low: number;
  open: number;
  volume?: number;
}

export class TiingoService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly httpClient: typeof ky;

  /**
   * @param apiKey Der TIINGO_KEY aus der Umgebung.
   * @param baseUrl Die Basis-URL (z.B. "https://api.tiingo.com/").
   * @param httpClient Die ky-Instanz für Mocking/Testing.
   */
  constructor(apiKey: string, baseUrl: string, httpClient: typeof ky) {
    if (!apiKey || apiKey.trim() === "") {
      throw new Error("TiingoService: API-Key darf nicht leer sein.");
    }
    if (!baseUrl || baseUrl.trim() === "") {
      throw new Error("TiingoService: Basis-URL darf nicht leer sein.");
    }

    this.apiKey = apiKey;
    this.baseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    this.httpClient = httpClient;
  }

  /**
   * Holt Preisdaten für einen spezifischen Ticker und eine Frequenz.
   * URL: iex/TICKER/prices?resampleFreq=FREQUENZ&token=TIINGO_KEY
   */
  async getPrices(ticker: string, frequency: string): Promise<TiingoPriceResponse[]> {
    // 1. Pinigelige Validierung der Parameter
    if (!ticker || typeof ticker !== "string" || ticker.trim() === "") {
      throw new Error("TiingoService.getPrices: Ticker ist ungültig.");
    }
    if (!frequency || typeof frequency !== "string" || frequency.trim() === "") {
      throw new Error("TiingoService.getPrices: Frequenz ist ungültig.");
    }

    const sanitizedTicker = ticker.trim().toUpperCase();
    const sanitizedFreq = frequency.trim().toLowerCase();

    try {
      // 2. HTTP Call via ky
      const response = await this.httpClient.get(`iex/${sanitizedTicker}/prices`, {
        prefixUrl: this.baseUrl,
        searchParams: {
          resampleFreq: sanitizedFreq,
          token: this.apiKey,
        },
        // Timeout und Retries können hier global oder per call gesteuert werden
        retry: 0, 
      });

      // 3. Status-Prüfung (ky wirft bei !2xx automatisch Fehler, wir validieren hier explizit)
      if (response.status !== HttpStatus.OK) {
        throw new Error(`TiingoService: Unerwarteter Statuscode ${response.status}`);
      }

      return await response.json<TiingoPriceResponse[]>();

    } catch (error) {
      // 4. Meticulous Error Handling
      if (error.name === "HTTPError") {
        const status = error.response?.status;

        switch (status) {
          case HttpStatus.UNAUTHORIZED:
            throw new Error("TiingoService: Ungültiger API-Key (401).");
          case HttpStatus.TOO_MANY_REQUESTS:
            throw new Error("TiingoService: Rate-Limit erreicht (429).");
          case HttpStatus.NOT_FOUND:
            throw new Error(`TiingoService: Ticker '${sanitizedTicker}' nicht gefunden (404).`);
          default:
            throw new Error(`TiingoService: Netzwerkfehler (${status || 'Unknown'}).`);
        }
      }

      throw new Error(`TiingoService: Interner Fehler - ${error.message}`);
    }
  }
}