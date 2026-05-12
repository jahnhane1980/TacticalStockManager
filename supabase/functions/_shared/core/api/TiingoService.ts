import ky from "ky";
import { z } from "zod";
import { BaseApiService } from "api/BaseApiService.ts";
import { PriceStringSchema } from "core/models/ZodUtils.ts";

/**
 * Fehler-Codes für den TiingoService (Regel 14).
 */
export const TiingoErrorCodes = {
  VALIDATION_ERROR: "TIINGO_VALIDATION_ERROR",
  UNAUTHORIZED: "TIINGO_UNAUTHORIZED",
  NOT_FOUND: "TIINGO_NOT_FOUND",
  RATE_LIMIT: "TIINGO_RATE_LIMIT",
  NETWORK_ERROR: "TIINGO_NETWORK_ERROR",
  INTERNAL_ERROR: "TIINGO_INTERNAL_ERROR",
} as const;

/**
 * Typ für Tiingo-Fehlercodes.
 */
type TiingoErrorCode = typeof TiingoErrorCodes[keyof typeof TiingoErrorCodes];

/**
 * Statisches Mapping für Fehlermeldungen (Regel 14).
 */
export const TiingoErrorMessages: Record<TiingoErrorCode, string> = {
  [TiingoErrorCodes.VALIDATION_ERROR]: "TiingoService: Validierungsfehler - {}",
  [TiingoErrorCodes.UNAUTHORIZED]: "TiingoService: Ungültiger API-Key (401).",
  [TiingoErrorCodes.NOT_FOUND]: "TiingoService: Ticker '{}' nicht gefunden (404).",
  [TiingoErrorCodes.RATE_LIMIT]: "TiingoService: Rate-Limit erreicht (429).",
  [TiingoErrorCodes.NETWORK_ERROR]: "TiingoService: Netzwerkfehler ({}).",
  [TiingoErrorCodes.INTERNAL_ERROR]: "TiingoService: Interner Fehler - {}",
};

/**
 * Zod-Schema für die Validierung der Tiingo-Historien-Daten.
 */
export const TiingoHistoricalDataSchema = z.object({
  date: z.string(),
  close: PriceStringSchema,
  high: PriceStringSchema,
  low: PriceStringSchema,
  open: PriceStringSchema,
  volume: z.number(),
  adjClose: PriceStringSchema,
  adjHigh: PriceStringSchema,
  adjLow: PriceStringSchema,
  adjOpen: PriceStringSchema,
  adjVolume: z.number(),
  divCash: PriceStringSchema,
  splitFactor: PriceStringSchema,
});

/**
 * Type-Definition für historische Kursdaten.
 */
export type TiingoHistoricalData = z.infer<typeof TiingoHistoricalDataSchema>;

/**
 * Zod-Schema für IEX-Preisdaten (Regel 26 & 27).
 */
export const TiingoIexResponseSchema = z.object({
  date: z.string(),
  close: PriceStringSchema,
  high: PriceStringSchema,
  low: PriceStringSchema,
  open: PriceStringSchema,
  volume: z.number().optional(),
});

/**
 * Type-Definition für IEX-Preisdaten.
 */
export type TiingoPriceResponse = z.infer<typeof TiingoIexResponseSchema>;

/**
 * Service für die Interaktion mit der Tiingo-API.
 */
export class TiingoService extends BaseApiService {
  private readonly apiKey: string;

  /**
   * @param apiKey Der TIINGO_KEY aus der Umgebung.
   * @param baseUrl Die Basis-URL (z.B. "https://api.tiingo.com/").
   * @param httpClient Die ky-Instanz für Mocking/Testing.
   */
  constructor(apiKey: string, baseUrl: string, httpClient: typeof ky) {
    super(baseUrl, httpClient);
    if (!apiKey || apiKey.trim() === "") {
      throw new Error("TiingoService: API-Key darf nicht leer sein.");
    }
    this.apiKey = apiKey;
  }

  /**
   * Holt historische Preisdaten für einen spezifischen Ticker ab einem Startdatum.
   */
  async getHistoricalData(ticker: string, startDate: string): ServiceResponse<TiingoHistoricalData[]> {
    if (!ticker || typeof ticker !== "string" || ticker.trim() === "") {
      return {
        data: null,
        error: {
          message: TiingoErrorMessages[TiingoErrorCodes.VALIDATION_ERROR].replace("{}", "Ticker ungültig"),
          code: TiingoErrorCodes.VALIDATION_ERROR,
        },
      };
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!startDate || !dateRegex.test(startDate)) {
      return {
        data: null,
        error: {
          message: TiingoErrorMessages[TiingoErrorCodes.VALIDATION_ERROR].replace("{}", "Format YYYY-MM-DD erforderlich"),
          code: TiingoErrorCodes.VALIDATION_ERROR,
        },
      };
    }

    return this.fetchTiingoPrices(ticker, startDate);
  }

  /**
   * Holt die aktuellsten täglichen Preisdaten für einen Ticker.
   */
  async getDaily(ticker: string): ServiceResponse<TiingoHistoricalData[]> {
    if (!ticker || typeof ticker !== "string" || ticker.trim() === "") {
      return {
        data: null,
        error: {
          message: TiingoErrorMessages[TiingoErrorCodes.VALIDATION_ERROR].replace("{}", "Ticker ungültig"),
          code: TiingoErrorCodes.VALIDATION_ERROR,
        },
      };
    }

    return this.fetchTiingoPrices(ticker);
  }

  /**
   * Zentraler Abruf von Tiingo-Preisen.
   */
  private async fetchTiingoPrices(ticker: string, startDate?: string): ServiceResponse<TiingoHistoricalData[]> {
    const sanitizedTicker = ticker.trim().toLowerCase();
    const searchParams: Record<string, string> = { token: this.apiKey };
    if (startDate) searchParams.startDate = startDate;

    return this.safeRequest(
      () => this.httpClient.get(`tiingo/daily/${sanitizedTicker}/prices`, {
        prefixUrl: this.baseUrl,
        searchParams: searchParams,
        retry: 0,
      }),
      TiingoErrorMessages,
      TiingoErrorCodes.INTERNAL_ERROR,
      z.array(TiingoHistoricalDataSchema),
      sanitizedTicker
    );
  }

  /**
   * Holt Preisdaten für einen spezifischen Ticker und eine Frequenz (IEX).
   */
  async getPrices(ticker: string, frequency: string): ServiceResponse<TiingoPriceResponse[]> {
    if (!ticker || typeof ticker !== "string" || ticker.trim() === "") {
      return {
        data: null,
        error: {
          message: TiingoErrorMessages[TiingoErrorCodes.VALIDATION_ERROR].replace("{}", "Ticker ungültig"),
          code: TiingoErrorCodes.VALIDATION_ERROR,
        },
      };
    }
    if (!frequency || typeof frequency !== "string" || frequency.trim() === "") {
      return {
        data: null,
        error: {
          message: TiingoErrorMessages[TiingoErrorCodes.VALIDATION_ERROR].replace("{}", "Frequenz ungültig"),
          code: TiingoErrorCodes.VALIDATION_ERROR,
        },
      };
    }

    const sanitizedTicker = ticker.trim().toUpperCase();
    const sanitizedFreq = frequency.trim().toLowerCase();

    return this.safeRequest(
      () => this.httpClient.get(`iex/${sanitizedTicker}/prices`, {
        prefixUrl: this.baseUrl,
        searchParams: {
          resampleFreq: sanitizedFreq,
          token: this.apiKey,
        },
        retry: 0,
      }),
      TiingoErrorMessages,
      TiingoErrorCodes.INTERNAL_ERROR,
      z.array(TiingoIexResponseSchema),
      sanitizedTicker.toLowerCase()
    );
  }
}
