// functions/_shared/core/network/HttpStatus.ts

/**
 * Sammlung relevanter HTTP-Statuscodes für die API-Kommunikation.
 */
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  SERVER_ERROR: 500,
} as const;

export type HttpStatusType = typeof HttpStatus[keyof typeof HttpStatus];