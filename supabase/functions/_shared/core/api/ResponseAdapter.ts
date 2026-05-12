// functions/_shared/core/api/ResponseAdapter.ts

import { HttpStatus } from "network/HttpStatus.ts";

/**
 * Adapter zur Standardisierung von API-Antworten und Fehlerbehandlung (Regel 4).
 */
export class ResponseAdapter {
  /**
   * Zentrales Error-Handling für HTTP-Fehler (Regel 1, 4 & 14).
   * 
   * @param error Der abgefangene Fehler (unknown).
   * @param dictionary Das Mapping von Fehler-Codes auf Nachrichten.
   * @param fallbackCode Der Code, der bei unbekannten Fehlern genutzt wird.
   * @param resource Optionaler Name der Ressource (z.B. Ticker) für 404-Fehler.
   * @returns Das standardisierte Response-Format.
   */
  handleHttpError<T>(
    error: unknown,
    dictionary: Record<string, string>,
    fallbackCode: string,
    resource?: string
  ): { data: null; error: { message: string; code: string } } {
    // Regel 1: Zero-Any Compliance via Type-Guards
    if (error instanceof Error && error.name === "HTTPError" && "response" in error) {
      const response = Reflect.get(error, "response");

      if (response instanceof Response) {
        const status = response.status;
        let code = fallbackCode;

        // Status-Mapping auf Service-spezifische Codes (Beispielhaft, erweiterbar)
        switch (status) {
          case HttpStatus.UNAUTHORIZED:
            code = this.findCodeBySuffix(dictionary, "UNAUTHORIZED") || fallbackCode;
            break;
          case HttpStatus.TOO_MANY_REQUESTS:
            code = this.findCodeBySuffix(dictionary, "RATE_LIMIT") || fallbackCode;
            break;
          case HttpStatus.NOT_FOUND:
            code = this.findCodeBySuffix(dictionary, "NOT_FOUND") || fallbackCode;
            break;
          default:
            code = this.findCodeBySuffix(dictionary, "NETWORK_ERROR") || fallbackCode;
            break;
        }

        const message = dictionary[code] || "Netzwerkfehler";
        const finalMessage = status === HttpStatus.NOT_FOUND && resource 
          ? message.replace("{}", resource) 
          : message.replace("{}", String(status));

        return {
          data: null,
          error: {
            message: finalMessage,
            code: code,
          },
        };
      }
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown Error";
    return {
      data: null,
      error: {
        message: (dictionary[fallbackCode] || "Interner Fehler: {}").replace("{}", errorMessage),
        code: fallbackCode,
      },
    };
  }

  /**
   * Hilfsmethode um Codes im Dictionary anhand eines Suffixes zu finden (z.B. "UNAUTHORIZED").
   */
  private findCodeBySuffix(dictionary: Record<string, string>, suffix: string): string | undefined {
    return Object.keys(dictionary).find((key) => key.endsWith(suffix));
  }
}
