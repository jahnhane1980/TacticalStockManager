import { z } from "zod";
import { PriceStringSchema } from "core/models/ZodUtils.ts";

/**
 * Zod-Schema für die Entität 'market_data_daily' (Regel 26, 27 & 28).
 * Repräsentiert einen Datensatz in der Datenbank.
 */
export const MarketDataDailyEntitySchema = z.object({
  ticker: z.string(),
  ts: z.string(), // ISO-Timestamp
  open: PriceStringSchema,
  high: PriceStringSchema,
  low: PriceStringSchema,
  close: PriceStringSchema,
  adj_close: PriceStringSchema,
  volume: z.number().int(),
  
  // Technische Indikatoren (Optional/Berechnet)
  // Wir nutzen PriceStringSchema direkt, da es null bereits zu "0" wandelt.
  // Mit .optional() erlauben wir das Fehlen des Keys (undefined).
  sma_200: PriceStringSchema.optional(),
  sma_50_h: PriceStringSchema.optional(),
  sma_50_l: PriceStringSchema.optional(),
  atr_14: PriceStringSchema.optional(),

  // Metadaten / Flexibilität
  extras: z.unknown().nullish(),
  raw_json: z.unknown().nullish(),
});

/**
 * Type-Definition für eine MarketDataDaily Entität.
 */
export type MarketDataDailyEntity = z.infer<typeof MarketDataDailyEntitySchema>;

/**
 * Zod-Schema für die Entität 'market_data_observation' (Regel 26 & 27).
 * Wird für kurzfristige Beobachtungen (z.B. 1h-Intervall) genutzt.
 */
export const MarketObservationEntitySchema = z.object({
  ticker: z.string(),
  ts: z.string(),
  open: PriceStringSchema,
  high: PriceStringSchema,
  low: PriceStringSchema,
  close: PriceStringSchema,

  // Optionale Indikatoren
  rescue_sma_10: PriceStringSchema.optional(),
  chandelier_stop: PriceStringSchema.optional(),

  // Flag für Parabolik-Modus (Regel 28: Default-Werte via Zod)
  is_para_mode: z.boolean().default(false),
});

/**
 * Type-Definition für eine MarketObservation Entität.
 */
export type MarketObservationEntity = z.infer<typeof MarketObservationEntitySchema>;
