// functions/_shared/core/api/TiingoService.ts

import ky from "ky";
import { z } from "zod";
import { HttpStatus } from "network/HttpStatus.ts";

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
 * Nutzt Platzhalter für dynamische Werte, um Logik-Literale zu vermeiden.
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
 * Hilfs-Schema für Preis-Strings (Regel 27).
 * Verhindert, dass 'null' oder 'undefined' zu Strings ("null") konvertiert werden.
 */
const PriceStringSchema = z.union([z.string(), z.number()]).transform((val) => String(val));

/**
 * Standard-Response Format nach Regel 4.
 */
export type ServiceResponse<T> = Promise<{
  data: T | null;
  error: { message: string; code: string } | null;
}>;

/**
 * Zod-Schema für die Validierung der Tiingo-Historien-Daten.
 * Nutzt Source-of-Truth aus AAPL_2year.json.
 * Alle Preise werden als Strings validiert, um Floats zu vermeiden (Regel 27).
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
   * Holt historische Preisdaten für einen spezifischen Ticker ab einem Startdatum.
   * URL: tiingo/daily/TICKER/prices?startDate=YYYY-MM-DD&token=TIINGO_KEY
   * 
   * @param ticker Das Börsenkürzel (z.B. "AAPL").
   * @param startDate Das Startdatum im Format 'YYYY-MM-DD'.
   * @returns Eine Liste validierter historischer Daten (Regel 4 & 26 & 27).
   */
  async getHistoricalData(ticker: string, startDate: string): ServiceResponse<TiingoHistoricalData[]> {
    // 1. Validierung der Parameter
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
   * URL: tiingo/daily/TICKER/prices?token=TIINGO_KEY
   * 
   * @param ticker Das Börsenkürzel (z.B. "AAPL").
   * @returns Eine Liste validierter historischer Daten (Regel 4 & 26 & 27).
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
   * Zentraler Abruf von Tiingo-Preisen (Fassade).
   * 
   * @param ticker Das Börsenkürzel.
   * @param startDate Optionales Startdatum.
   */
  private async fetchTiingoPrices(ticker: string, startDate?: string): ServiceResponse<TiingoHistoricalData[]> {
    const sanitizedTicker = ticker.trim().toLowerCase();

    try {
      const searchParams: Record<string, string> = {
        token: this.apiKey,
      };

      if (startDate) {
        searchParams.startDate = startDate;
      }

      const response = await this.httpClient.get(`tiingo/daily/${sanitizedTicker}/prices`, {
        prefixUrl: this.baseUrl,
        searchParams: searchParams,
        retry: 0,
      });

      if (response.status !== HttpStatus.OK) {
        return {
          data: null,
          error: {
            message: TiingoErrorMessages[TiingoErrorCodes.NETWORK_ERROR].replace("{}", String(response.status)),
            code: TiingoErrorCodes.NETWORK_ERROR,
          },
        };
      }

      const rawData = await response.json();
      
      const validationResult = z.array(TiingoHistoricalDataSchema).safeParse(rawData);
      if (!validationResult.success) {
        return {
          data: null,
          error: {
            message: TiingoErrorMessages[TiingoErrorCodes.VALIDATION_ERROR].replace("{}", validationResult.error.message),
            code: TiingoErrorCodes.VALIDATION_ERROR,
          },
        };
      }

      return { data: validationResult.data, error: null };

    } catch (error: unknown) {
      return this.handleHttpError(error, sanitizedTicker);
    }
  }

  /**
   * Holt Preisdaten für einen spezifischen Ticker und eine Frequenz (IEX).
   * URL: iex/TICKER/prices?resampleFreq=FREQUENZ&token=TIINGO_KEY
   * 
   * @param ticker Das Börsenkürzel (z.B. "AAPL").
   * @param frequency Die Resample-Frequenz (z.B. "1hour").
   * @returns Eine Liste validierter IEX-Preisdaten (Regel 4 & 26 & 27).
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

    try {
      const response = await this.httpClient.get(`iex/${sanitizedTicker}/prices`, {
        prefixUrl: this.baseUrl,
        searchParams: {
          resampleFreq: sanitizedFreq,
          token: this.apiKey,
        },
        retry: 0, 
      });

      if (response.status !== HttpStatus.OK) {
        return {
          data: null,
          error: {
            message: TiingoErrorMessages[TiingoErrorCodes.NETWORK_ERROR].replace("{}", String(response.status)),
            code: TiingoErrorCodes.NETWORK_ERROR,
          },
        };
      }

      // Regel 26: Zero-Trust Validation. Entfernung von 'as any'.
      const rawData = await response.json();
      const validationResult = z.array(TiingoIexResponseSchema).safeParse(rawData);
      
      if (!validationResult.success) {
        return {
          data: null,
          error: {
            message: TiingoErrorMessages[TiingoErrorCodes.VALIDATION_ERROR].replace("{}", validationResult.error.message),
            code: TiingoErrorCodes.VALIDATION_ERROR,
          },
        };
      }

      // Regel 27: Financial Precision ist durch PriceStringSchema sichergestellt.
      return { data: validationResult.data, error: null };

    } catch (error: unknown) {
      return this.handleHttpError(error, sanitizedTicker);
    }
  }

  /**
   * Zentrales Error-Handling für HTTP-Fehler (Regel 1 & 4).
   * Entfernt 'as any' Casting und nutzt Type-Guards (Regel 1).
   */
  private handleHttpError(error: unknown, ticker: string): { data: null; error: { message: string; code: string } } {
    if (error instanceof Error && error.name === "HTTPError" && "response" in error) {
      const response = error.response;
      
      if (response instanceof Response) {
        const status = response.status;

        switch (status) {
          case HttpStatus.UNAUTHORIZED:
            return {
              data: null,
              error: { 
                message: TiingoErrorMessages[TiingoErrorCodes.UNAUTHORIZED], 
                code: TiingoErrorCodes.UNAUTHORIZED 
              },
            };
          case HttpStatus.TOO_MANY_REQUESTS:
            return {
              data: null,
              error: { 
                message: TiingoErrorMessages[TiingoErrorCodes.RATE_LIMIT], 
                code: TiingoErrorCodes.RATE_LIMIT 
              },
            };
          case HttpStatus.NOT_FOUND:
            return {
              data: null,
              error: { 
                message: TiingoErrorMessages[TiingoErrorCodes.NOT_FOUND].replace("{}", ticker), 
                code: TiingoErrorCodes.NOT_FOUND 
              },
            };
          default:
            return {
              data: null,
              error: { 
                message: TiingoErrorMessages[TiingoErrorCodes.NETWORK_ERROR].replace("{}", String(status || "Unknown")), 
                code: TiingoErrorCodes.NETWORK_ERROR 
              },
            };
        }
      }
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown Error";
    return {
      data: null,
      error: {
        message: TiingoErrorMessages[TiingoErrorCodes.INTERNAL_ERROR].replace("{}", errorMessage),
        code: TiingoErrorCodes.INTERNAL_ERROR,
      },
    };
  }
}
