import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { PriceStringSchema } from "core/models/ZodUtils.ts";

/**
 * ZodUtils_test.ts (V14.0)
 * Testet das PriceStringSchema gemäß Regel 27 (Financial Precision).
 */

Deno.test("ZodUtils - PriceStringSchema: Validiert String-Zahlen", () => {
  const result = PriceStringSchema.safeParse("123.45");
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data, "123.45");
  }
});

Deno.test("ZodUtils - PriceStringSchema: Transformiert Numbers zu Strings", () => {
  const result = PriceStringSchema.safeParse(123.45);
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data, "123.45");
  }
});

Deno.test("ZodUtils - PriceStringSchema: Transformiert null zu '0'", () => {
  const result = PriceStringSchema.safeParse(null);
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data, "0");
  }
});

Deno.test("ZodUtils - PriceStringSchema: Weist ungültige Typen ab (Object)", () => {
  const result = PriceStringSchema.safeParse({ price: 100 });
  assertEquals(result.success, false);
});

Deno.test("ZodUtils - PriceStringSchema: Weist ungültige Typen ab (Array)", () => {
  const result = PriceStringSchema.safeParse([100]);
  assertEquals(result.success, false);
});

Deno.test("ZodUtils - PriceStringSchema: Weist undefined ab", () => {
  const result = PriceStringSchema.safeParse(undefined);
  assertEquals(result.success, false);
});
