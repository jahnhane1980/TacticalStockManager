// functions/_shared/core/api/BaseApiService.ts

import ky from "ky";
import { z } from "zod";
import { ResponseAdapter } from "api/ResponseAdapter.ts";
import { PriceStringSchema } from "core/models/ZodUtils.ts";

/**
 * Basis-Klasse für alle API-Services (Engine-Adapter-Pattern).
 */
export abstract class BaseApiService {
  protected readonly baseUrl: string;
  protected readonly httpClient: typeof ky;
  protected readonly adapter: ResponseAdapter;

  /**
   * @param baseUrl Die Basis-URL des Services.
   * @param httpClient Die ky-Instanz.
   */
  constructor(baseUrl: string, httpClient: typeof ky) {
    if (!baseUrl || baseUrl.trim() === "") {
      throw new Error("BaseApiService: Basis-URL darf nicht leer sein.");
    }
    this.baseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    this.httpClient = httpClient;
    this.adapter = new ResponseAdapter();
  }

  /**
   * Führt einen Request aus und fängt Fehler zentral ab (Regel 4).
   * 
   * @param requestFn Die Funktion, die den ky-Request ausführt.
   * @param dictionary Das Fehler-Dictionary des Services.
   * @param fallbackCode Der Fallback-Fehlercode.
   * @param schema Das Zod-Schema zur Validierung der Response.
   * @param resource Optionaler Name der Ressource (z.B. Ticker).
   */
  protected async safeRequest<T>(
    requestFn: () => Promise<Response>,
    dictionary: Record<string, string>,
    fallbackCode: string,
    schema: z.ZodSchema<T>,
    resource?: string
  ): Promise<{ data: T | null; error: { message: string; code: string } | null }> {
    try {
      const response = await requestFn();
      
      const rawData = await response.json();
      const validationResult = schema.safeParse(rawData);

      if (!validationResult.success) {
        const validationCode = Object.keys(dictionary).find(k => k.endsWith("VALIDATION_ERROR")) || fallbackCode;
        return {
          data: null,
          error: {
            message: (dictionary[validationCode] || "Validierungsfehler: {}").replace("{}", validationResult.error.message),
            code: validationCode,
          },
        };
      }

      return { data: validationResult.data, error: null };
    } catch (error: unknown) {
      return this.adapter.handleHttpError<T>(error, dictionary, fallbackCode, resource);
    }
  }
}
