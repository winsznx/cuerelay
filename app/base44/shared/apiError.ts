// Stable error shape per PRD §8.4.
export type ApiErrorCode =
  | "NOT_AUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "DEPENDENCY_CYCLE"
  | "UNRESOLVED_CONFLICT"
  | "STALE_REVISION"
  | "PUBLISH_IN_PROGRESS"
  | "DUPLICATE_REQUEST"
  | "EMAIL_NOT_ELIGIBLE"
  | "RATE_LIMITED"
  | "SERVICE_UNAVAILABLE";

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  NOT_AUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  DEPENDENCY_CYCLE: 400,
  UNRESOLVED_CONFLICT: 409,
  STALE_REVISION: 409,
  PUBLISH_IN_PROGRESS: 409,
  DUPLICATE_REQUEST: 409,
  EMAIL_NOT_ELIGIBLE: 422,
  RATE_LIMITED: 429,
  SERVICE_UNAVAILABLE: 503,
};

export function apiError(code: ApiErrorCode, message: string, details?: Record<string, unknown>): Response {
  return Response.json({ ok: false, error: { code, message, details } }, { status: STATUS_BY_CODE[code] });
}

export function apiOk<T extends Record<string, unknown>>(body: T, status = 200): Response {
  return Response.json({ ok: true, ...body }, { status });
}
