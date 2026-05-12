// supabase/functions/_shared/core/repository/BaseRepository.ts

import { SupabaseClient, PostgrestError } from "supabase";

/**
 * Standard-Response Format für Repositories nach Regel 4.
 */
export type RepoResponse<T> = Promise<{
  data: T | null;
  error: { message: string; code: string } | null;
}>;

/**
 * Basis-Klasse für alle Repositories (Engine-Adapter-Pattern).
 * Bietet zentrales Error-Handling und Datenbank-Zugriff.
 */
export abstract class BaseRepository {
  protected readonly supabase: SupabaseClient;

  /**
   * @param supabase Der injizierte Supabase-Client.
   */
  constructor(supabase: SupabaseClient) {
    if (!supabase) {
      throw new Error("BaseRepository: SupabaseClient darf nicht null sein.");
    }
    this.supabase = supabase;
  }

  /**
   * Analysiert Datenbank-Fehler und mappt sie gegen ein Dictionary (Regel 14 & 1).
   * 
   * @param error Der von Supabase zurückgegebene PostgrestError.
   * @param dictionary Mapping von Fehler-Codes auf Nachrichten.
   * @param fallbackCode Standard-Fehlercode bei fehlendem Mapping.
   * @returns Das standardisierte Error-Objekt.
   */
  protected handleDbError<T>(
    error: PostgrestError,
    dictionary: Record<string, string>,
    fallbackCode: string
  ): { data: null; error: { message: string; code: string } } {
    // Sicherer Zugriff auf das Dictionary via 'in'-Operator (Regel 1)
    const code = error.code in dictionary ? error.code : fallbackCode;
    
    // Nachricht aus Dictionary holen oder Fallback generieren
    const messageTemplate = dictionary[code] || "Datenbankfehler: {}";
    const message = messageTemplate.replace("{}", error.message);

    return {
      data: null,
      error: {
        message: message,
        code: code,
      },
    };
  }
}
