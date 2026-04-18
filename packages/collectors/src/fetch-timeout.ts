export const COLLECTOR_FETCH_TIMEOUT_MS = 30_000;

export function collectorFetchSignal(): AbortSignal {
  return AbortSignal.timeout(COLLECTOR_FETCH_TIMEOUT_MS);
}
