import type {
  FetchRun,
  FeedErrorCode,
  ItemStatus,
  PaginatedItemsResponse,
  SourceResult,
  TimeLimitEntry,
  TimeLimitsResponse,
  TimeUsageResponse,
} from "connectors/types";

export type { FetchRun, FeedErrorCode, ItemStatus, PaginatedItemsResponse, SourceResult, TimeLimitEntry, TimeLimitsResponse, TimeUsageResponse };

export interface SourceSummary {
  readonly name: string;
  readonly url: string;
  readonly feedName: string;
  readonly plugin?: string;
  readonly lastStatus?: "success" | "error" | "skipped";
  readonly lastErrorMessage?: string;
  readonly lastErrorCode?: FeedErrorCode;
}

// --- Access key helpers ---

const ACCESS_KEY_STORAGE_KEY = "openfeed_access_key";

export const getAccessKey = (): string | null =>
  localStorage.getItem(ACCESS_KEY_STORAGE_KEY);

export const setAccessKey = (key: string): void =>
  localStorage.setItem(ACCESS_KEY_STORAGE_KEY, key);

export const clearAccessKey = (): void =>
  localStorage.removeItem(ACCESS_KEY_STORAGE_KEY);

const getAuthHeaders = (): Record<string, string> => {
  const key = getAccessKey();
  return key != null ? { Authorization: `Bearer ${key}` } : {};
};

// --- Request helpers ---

// Extracts a descriptive error message from a failed response.
// Prefers the server's { error: string } body over the HTTP status text,
// which can be empty in HTTP/2 responses.
const getErrorMessage = async (res: Response, fallback: string): Promise<string> => {
  if (res.status === 401) {
    // Lazily import to avoid circular deps — authState is only needed at runtime
    const { authState } = await import("./state/authState");
    authState.showAuthModal = true;
    return "Access key required";
  }
  try {
    const body = await res.json() as { error?: string };
    if (typeof body.error === "string" && body.error.length > 0) return body.error;
  } catch {
    // Response body is not JSON — fall through to the fallback
  }
  return res.statusText.length > 0 ? `${fallback} (${res.statusText})` : `${fallback} (status ${res.status})`;
};

export const fetchItems = async (
  status: ItemStatus,
  feedName?: string,
  limit = 30,
  offset = 0,
): Promise<PaginatedItemsResponse> => {
  const params = new URLSearchParams({ status, limit: String(limit), offset: String(offset) });
  if (feedName != null) params.set("feed", feedName);
  const res = await fetch(`/api/items?${params.toString()}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(await getErrorMessage(res, "Could not load your feed items"));
  return res.json();
};

export const updateItemStatus = async (id: string, status: ItemStatus): Promise<void> => {
  const res = await fetch(`/api/items/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(await getErrorMessage(res, "Could not update the item"));
};

export const triggerFetch = async (): Promise<{ runId: string }> => {
  const res = await fetch("/api/fetch", { method: "POST", headers: getAuthHeaders() });
  if (!res.ok) throw new Error(await getErrorMessage(res, "Could not start a fetch"));
  return res.json();
};

export const fetchRuns = async (limit?: number): Promise<FetchRun[]> => {
  const params = limit != null ? `?limit=${limit}` : "";
  const res = await fetch(`/api/runs${params}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(await getErrorMessage(res, "Could not load fetch history"));
  return res.json();
};

export const fetchFeeds = async (): Promise<{ name: string }[]> => {
  const res = await fetch("/api/feeds", { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(await getErrorMessage(res, "Could not load your feeds"));
  return res.json();
};

export const fetchTimeLimits = async (): Promise<TimeLimitsResponse> => {
  const res = await fetch("/api/time/limits", { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(await getErrorMessage(res, "Could not load time limits"));
  return res.json();
};

export const fetchTimeUsage = async (date: string): Promise<TimeUsageResponse> => {
  const res = await fetch(`/api/time/usage?date=${encodeURIComponent(date)}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(await getErrorMessage(res, "Could not load time usage"));
  return res.json();
};

export const recordTimeSession = async (feedName: string | null, durationMs: number, date: string): Promise<void> => {
  const res = await fetch("/api/time/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ feedName: feedName ?? undefined, durationMs, date }),
  });
  if (!res.ok) throw new Error(await getErrorMessage(res, "Could not record reading time"));
};

export const fetchSources = async (): Promise<SourceSummary[]> => {
  const res = await fetch("/api/sources", { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(await getErrorMessage(res, "Could not load sources"));
  return res.json();
};

export const fetchConfig = async (): Promise<string> => {
  const res = await fetch("/api/config", { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(await getErrorMessage(res, "Could not load the config file"));
  return res.text();
};

export const fetchAuthStatus = async (): Promise<{ required: boolean }> => {
  // No auth header — this endpoint is always public
  const res = await fetch("/api/auth/status");
  if (!res.ok) throw new Error("Could not load auth status");
  return res.json();
};
