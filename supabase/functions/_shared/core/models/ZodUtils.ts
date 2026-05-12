import { z } from "zod";

/**
 * PriceStringSchema (Regel 27)
 * Zentrale Validierung für Finanzwerte zur Vermeidung von Float-Ungenauigkeiten.
 * Wandelt Zahlen und null-Werte in Strings um.
 */
export const PriceStringSchema = z.union([z.string(), z.number(), z.null()])
  .transform((val) => (val === null ? "0" : String(val)));
