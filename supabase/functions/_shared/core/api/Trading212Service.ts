// functions/_shared/core/api/Trading212Service.ts

import ky from "ky";
import { z } from "zod";
import { HttpStatus } from "network/HttpStatus.ts";

/**
 * Fehler-Codes für den Trading212Service (Regel 14).
 */
export const Trading212ErrorCodes = {
  VALIDATION_ERROR: "T212_VALIDATION_ERROR",
  UNAUTHORIZED: "T212_UNAUTHORIZED",
  NOT_FOUND: "T212_NOT_FOUND",
  RATE_LIMIT: "T212_RATE_LIMIT",
  NETWORK_ERROR: "T212_NETWORK_ERROR",
  INTERNAL_ERROR: "T212_INTERNAL_ERROR",
} as const;

/**
 * Typ für Trading212-Fehlercodes.
 */
type Trading212ErrorCode = typeof Trading212ErrorCodes[keyof typeof Trading212ErrorCodes];

/**
 * Statisches Mapping für Fehlermeldungen (Regel 14).
 */
export const Trading212ErrorMessages: Record<Trading212ErrorCode, string> = {
  [Trading212ErrorCodes.VALIDATION_ERROR]: "Trading212Service: Validierungsfehler - {}",
  [Trading212ErrorCodes.UNAUTHORIZED]: "Trading212Service: Ungültiger API-Key oder Secret (401).",
  [Trading212ErrorCodes.NOT_FOUND]: "Trading212Service: Ressource nicht gefunden (404).",
  [Trading212ErrorCodes.RATE_LIMIT]: "Trading212Service: Rate-Limit erreicht (429).",
  [Trading212ErrorCodes.NETWORK_ERROR]: "Trading212Service: Netzwerkfehler ({}).",
  [Trading212ErrorCodes.INTERNAL_ERROR]: "Trading212Service: Interner Fehler - {}",
};

/**
 * Hilfs-Schema für Finanzwerte (Regel 27).
 * Transformiert Zahlen oder Strings in Strings für exakte Berechnungen.
 */
const PriceStringSchema = z.union([z.string(), z.number(), z.null()]).transform((val) => val === null ? "0" : String(val));

/**
 * Zod-Schema für ein Instrument (Regel 26).
 */
const Trading212InstrumentSchema = z.object({
  ticker: z.string(),
  name: z.string(),
  isin: z.string(),
  currency: z.string(),
});

/**
 * Zod-Schema für den Wallet Impact (Regel 26 & 27).
 */
const Trading212WalletImpactSchema = z.object({
  currency: z.string(),
  totalCost: PriceStringSchema,
  currentValue: PriceStringSchema,
  unrealizedProfitLoss: PriceStringSchema,
  fxImpact: PriceStringSchema,
});

/**
 * Zod-Schema für eine Portfolio-Position (Regel 26 & 27).
 */
export const Trading212PortfolioSchema = z.object({
  instrument: Trading212InstrumentSchema,
  createdAt: z.string(),
  quantity: PriceStringSchema,
  quantityAvailableForTrading: PriceStringSchema,
  quantityInPies: PriceStringSchema,
  currentPrice: PriceStringSchema,
  averagePricePaid: PriceStringSchema,
  walletImpact: Trading212WalletImpactSchema,
});

/**
 * Typ für Trading212 Portfolio-Daten.
 */
export type Trading212Portfolio = z.infer<typeof Trading212PortfolioSchema>;

/**
 * Standard-Response Format nach Regel 4.
 */
export type ServiceResponse<T> = Promise<{
  data: T | null;
  error: { message: string; code: string } | null;
}>;

/**
 * Service für die Interaktion mit der Trading 212 API.
 */
export class Trading212Service {
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly baseUrl: string;
  private readonly httpClient: typeof ky;

  /**
   * @param apiKey Der API-Key.
   * @param apiSecret Das API-Secret.
   * @param baseUrl Die Basis-URL.
   * @param httpClient Die ky-Instanz.
   */
  constructor(apiKey: string, apiSecret: string, baseUrl: string, httpClient: typeof ky) {
    if (!apiKey || apiKey.trim() === "") {
      throw new Error("Trading212Service: API-Key darf nicht leer sein.");
    }
    if (!apiSecret || apiSecret.trim() === "") {
      throw new Error("Trading212Service: API-Secret darf nicht leer sein.");
    }
    if (!baseUrl || baseUrl.trim() === "") {
      throw new Error("Trading212Service: Basis-URL darf nicht leer sein.");
    }

    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    this.httpClient = httpClient;
  }

  /**
   * Holt die aktuellen Equity-Positionen (Portfolio).
   * 
   * @returns Eine Liste validierter Portfolio-Positionen.
   */
  async getPortfolio(): ServiceResponse<Trading212Portfolio[]> {
    const authHeader = `Basic ${btoa(`${this.apiKey}:${this.apiSecret}`)}`;

    try {
      const response = await this.httpClient.get("equity/positions", {
        prefixUrl: this.baseUrl,
        headers: {
          Authorization: authHeader,
        },
        retry: 0,
      });

      if (response.status !== HttpStatus.OK) {
        return {
          data: null,
          error: {
            message: Trading212ErrorMessages[Trading212ErrorCodes.NETWORK_ERROR].replace("{}", String(response.status)),
            code: Trading212ErrorCodes.NETWORK_ERROR,
          },
        };
      }

      const rawData = await response.json();
      const validationResult = z.array(Trading212PortfolioSchema).safeParse(rawData);

      if (!validationResult.success) {
        return {
          data: null,
          error: {
            message: Trading212ErrorMessages[Trading212ErrorCodes.VALIDATION_ERROR].replace("{}", validationResult.error.message),
            code: Trading212ErrorCodes.VALIDATION_ERROR,
          },
        };
      }

      return { data: validationResult.data, error: null };

    } catch (error: unknown) {
      return this.handleHttpError(error);
    }
  }

  /**
   * Zentrales Error-Handling für HTTP-Fehler (Regel 1 & 4).
   */
  private handleHttpError(error: unknown): { data: null; error: { message: string; code: string } } {
  if (error instanceof Error && error.name === "HTTPError" && "response" in error) {
      const response = Reflect.get(error, "response");
      
      if (response instanceof Response) {
        const status = response.status;

        switch (status) {
          case HttpStatus.UNAUTHORIZED:
            return {
              data: null,
              error: { 
                message: Trading212ErrorMessages[Trading212ErrorCodes.UNAUTHORIZED], 
                code: Trading212ErrorCodes.UNAUTHORIZED 
              },
            };
          case HttpStatus.TOO_MANY_REQUESTS:
            return {
              data: null,
              error: { 
                message: Trading212ErrorMessages[Trading212ErrorCodes.RATE_LIMIT], 
                code: Trading212ErrorCodes.RATE_LIMIT 
              },
            };
          case HttpStatus.NOT_FOUND:
            return {
              data: null,
              error: { 
                message: Trading212ErrorMessages[Trading212ErrorCodes.NOT_FOUND], 
                code: Trading212ErrorCodes.NOT_FOUND 
              },
            };
          default:
            return {
              data: null,
              error: { 
                message: Trading212ErrorMessages[Trading212ErrorCodes.NETWORK_ERROR].replace("{}", String(status || "Unknown")), 
                code: Trading212ErrorCodes.NETWORK_ERROR 
              },
            };
        }
      }
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown Error";
    return {
      data: null,
      error: {
        message: Trading212ErrorMessages[Trading212ErrorCodes.INTERNAL_ERROR].replace("{}", errorMessage),
        code: Trading212ErrorCodes.INTERNAL_ERROR,
      },
    };
  }
}
