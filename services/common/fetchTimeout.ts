/** Default timeout for a normal API call (search, create/update record, status check). */
export const DEFAULT_FETCH_TIMEOUT_MS = 20_000;
/** Longer timeout for large file transfers (video upload/download). */
export const LONG_FETCH_TIMEOUT_MS = 600_000;

/**
 * Wraps fetchImpl with a hard timeout via AbortSignal. Without this, a
 * hung/unresponsive endpoint blocks its caller for undici's default
 * headers timeout (5 minutes) with no visibility into why -- discovered
 * live when an untested Higgsfield fallback call hung the whole
 * /assets/attach request.
 */
export function fetchWithTimeout(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_FETCH_TIMEOUT_MS,
): Promise<Response> {
  return fetchImpl(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
}
