import { z } from "zod";
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
  is_active: z.boolean(),
  frequency_id: z.string(),
  last_sync: z.string().nullish(),
  raw_snapshot: z.unknown().nullish(),
});

/**
 * Typ für die Portfolio-Entität.
 */
export type PortfolioEntity = z.infer<typeof PortfolioEntitySchema>;
