// functions/_shared/core/api/Trading212Service.ts

import ky from "ky";
import { z } from "zod";
import { BaseApiService } from "api/BaseApiService.ts";

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
  totalCost: BaseApiService.PriceStringSchema,
  currentValue: BaseApiService.PriceStringSchema,
  unrealizedProfitLoss: BaseApiService.PriceStringSchema,
  fxImpact: BaseApiService.PriceStringSchema,
});

/**
 * Zod-Schema für eine Portfolio-Position (Regel 26 & 27).
 */
export const Trading212PortfolioSchema = z.object({
  instrument: Trading212InstrumentSchema,
  createdAt: z.string(),
  quantity: BaseApiService.PriceStringSchema,
  quantityAvailableForTrading: BaseApiService.PriceStringSchema,
  quantityInPies: BaseApiService.PriceStringSchema,
  currentPrice: BaseApiService.PriceStringSchema,
  averagePricePaid: BaseApiService.PriceStringSchema,
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
export class Trading212Service extends BaseApiService {
  private readonly apiKey: string;
  private readonly apiSecret: string;

  /**
   * @param apiKey Der API-Key.
   * @param apiSecret Das API-Secret.
   * @param baseUrl Die Basis-URL.
   * @param httpClient Die ky-Instanz.
   */
  constructor(apiKey: string, apiSecret: string, baseUrl: string, httpClient: typeof ky) {
    super(baseUrl, httpClient);
    if (!apiKey || apiKey.trim() === "") {
      throw new Error("Trading212Service: API-Key darf nicht leer sein.");
    }
    if (!apiSecret || apiSecret.trim() === "") {
      throw new Error("Trading212Service: API-Secret darf nicht leer sein.");
    }

    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  /**
   * Holt die aktuellen Equity-Positionen (Portfolio).
   * 
   * @returns Eine Liste validierter Portfolio-Positionen.
   */
  async getPortfolio(): ServiceResponse<Trading212Portfolio[]> {
    const authHeader = `Basic ${btoa(`${this.apiKey}:${this.apiSecret}`)}`;

    return this.safeRequest(
      () => this.httpClient.get("equity/positions", {
        prefixUrl: this.baseUrl,
        headers: {
          Authorization: authHeader,
        },
        retry: 0,
      }),
      Trading212ErrorMessages,
      Trading212ErrorCodes.INTERNAL_ERROR,
      z.array(Trading212PortfolioSchema)
    );
  }
}
