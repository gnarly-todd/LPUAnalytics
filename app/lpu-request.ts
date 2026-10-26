// LPU's user API is shared by profile controls and the background owner scan.
// Reserve capacity for interactive use and always honor the provider's cooldown.
const STATE_KEY = "lpu-request-budget-v1";
const WINDOW_MS = 20 * 60 * 1000;
// Allow one Top 50 scan plus ten recent requests within the shared window.
const BACKGROUND_LIMIT = 60;
type Budget = { retryAt: number; attempts: number[] };
let memory: Budget = { retryAt: 0, attempts: [] };

function readBudget(): Budget {
  try {
    if (typeof window !== "undefined") {
      const stored = JSON.parse(window.localStorage.getItem(STATE_KEY) || "null");
      if (stored && Array.isArray(stored.attempts)) memory = stored;
    }
  } catch {
    /* In-memory protection still works when storage is unavailable. */
  }
  memory.attempts = memory.attempts.filter(
    (time) => Number.isFinite(time) && time > Date.now() - WINDOW_MS,
  );
  return memory;
}

function saveBudget(budget: Budget) {
  memory = budget;
  try {
    if (typeof window !== "undefined")
      window.localStorage.setItem(STATE_KEY, JSON.stringify(budget));
  } catch {
    /* Storage errors must not fail a successful profile request. */
  }
}

export class LpuRateLimitError extends Error {
  constructor(
    public retryAt: number,
    public backgroundOnly = false,
  ) {
    super(
      `${backgroundOnly ? "Background owner checks are paused to keep profile loading available." : "LPU has temporarily limited profile requests."} Requests can resume after ${new Date(retryAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}. Saved data remains available.`,
    );
    this.name = "LpuRateLimitError";
  }
}

export function retryAtFromHeaders(headers: Headers, now = Date.now()): number {
  const value = headers.get("retry-after");
  const seconds = value ? Number(value) : NaN;
  const parsed = Number.isFinite(seconds) ? now + seconds * 1000 : Date.parse(value || "");
  return Number.isFinite(parsed) && parsed > now ? parsed : now + WINDOW_MS;
}

export function recordLpuCooldown(retryAt: number) {
  const budget = readBudget();
  budget.retryAt = Math.max(budget.retryAt || 0, retryAt);
  saveBudget(budget);
}

export function checkLpuBudget(background = false) {
  const budget = readBudget();
  if (budget.retryAt > Date.now()) throw new LpuRateLimitError(budget.retryAt);
  if (background && budget.attempts.length >= BACKGROUND_LIMIT)
    throw new LpuRateLimitError(budget.attempts[0] + WINDOW_MS + 1000, true);
}

export async function fetchLpuUser(
  id: string,
  signal?: AbortSignal,
  background = false,
): Promise<Response> {
  const githubPages =
    typeof window !== "undefined" && window.location?.hostname.endsWith("github.io");
  const proxied =
    typeof window !== "undefined" &&
    window.location &&
    !window.location.hostname.endsWith("github.io");
  const requestUrl = githubPages
    ? `https://todd-lpu-profile-relay.nicelife70117.chatgpt.site/api/lpu-user?userId=${encodeURIComponent(id)}`
    : proxied
      ? `/api/lpu-user?userId=${encodeURIComponent(id)}`
      : `https://api.lpubelts.com/api/v1/users/${encodeURIComponent(id)}`;
  const attempts = proxied || githubPages ? 1 : 2; // Both relays already retry upstream failures.
  for (let attempt = 0; attempt < attempts; attempt++) {
    signal?.throwIfAborted();
    checkLpuBudget(background);
    const budget = readBudget();
    budget.attempts.push(Date.now());
    saveBudget(budget);
    let response: Response;
    try {
      response = await fetch(requestUrl, {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(20_000)])
          : AbortSignal.timeout(20_000),
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      if (attempt === attempts - 1)
        throw new Error(
          "LPU’s profile service could not be reached. Your saved data has been kept. Please try again shortly.",
        );
      await new Promise((resolve) => setTimeout(resolve, 1000));
      continue;
    }
    if (response.status === 429) {
      const retryAt = retryAtFromHeaders(response.headers);
      recordLpuCooldown(retryAt);
      throw new LpuRateLimitError(retryAt);
    }
    if (response.ok || ![500, 502, 503, 504].includes(response.status) || attempt === attempts - 1)
      return response;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("LPU profile could not be loaded.");
}

// Persist full snapshots across tabs and reloads; timestamps stay unchanged.
export function readProfileCache<T extends { id: string; locks: unknown[] }>(id: string): T | null {
  for (const storageName of ["localStorage", "sessionStorage"] as const) {
    try {
      const value = JSON.parse(window[storageName].getItem(`lpu-profile-${id}`) || "null");
      if (value?.id === id && Array.isArray(value.locks)) return value as T;
    } catch {
      /* Try the other cache. */
    }
  }
  return null;
}

export function writeProfileCache(profile: { id: string; locks: unknown[] }) {
  for (const storageName of ["localStorage", "sessionStorage"] as const) {
    try {
      window[storageName].setItem(`lpu-profile-${profile.id}`, JSON.stringify(profile));
    } catch {
      /* A full or disabled cache must not break add/edit/refresh. */
    }
  }
}

export function removeProfileCache(id: string) {
  for (const storageName of ["localStorage", "sessionStorage"] as const) {
    try {
      window[storageName].removeItem(`lpu-profile-${id}`);
    } catch {
      /* Optional cache. */
    }
  }
}
