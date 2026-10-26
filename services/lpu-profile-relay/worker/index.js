const GITHUB_ORIGIN = "https://gnarly-todd.github.io";
const UPSTREAM = "https://api.lpubelts.com/api/v1/users/";
const WINDOW_MS = 20 * 60 * 1000;
const CACHE_MS = 30_000;
const PUBLIC_COLLECTIONS = ["own", "wishlist", "picked", "recorded", "recordedLocks", "scorecard", "safelocksOwn", "safelocksCracked", "safelocksWishlist"];

export function createRelay({ fetchUpstream = fetch, now = Date.now, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
  const cache = new Map();
  const pending = new Map();
  const budgets = new Map();
  let cooldownUntil = 0;
  const retryAt = (headers) => {
    const value = headers.get("retry-after");
    const numeric = value ? Number(value) : NaN;
    const date = Number.isFinite(numeric) ? now() + Math.max(0, numeric) * 1000 : Date.parse(value || "");
    return Number.isFinite(date) && date > now() ? date : now() + WINDOW_MS;
  };
  function consume(ip) {
    let budget = budgets.get(ip);
    if (!budget || budget.until <= now()) budget = { count: 0, until: now() + WINDOW_MS };
    if (budget.count >= 60) return budget.until;
    if (budgets.size >= 1000 && !budgets.has(ip)) budgets.delete(budgets.keys().next().value);
    budget.count++;
    budgets.set(ip, budget);
    return 0;
  }
  async function readProfile(id, ip) {
    const saved = cache.get(id);
    if (saved?.until > now()) return saved.result;
    if (cooldownUntil > now()) return { status: 429, body: { message: "LPU requests are temporarily limited. Saved results remain available.", retryAt: cooldownUntil } };
    if (pending.has(id)) return pending.get(id);
    const work = (async () => {
      for (let attempt = 0; attempt < 2; attempt++) {
        if (cooldownUntil > now()) return { status: 429, body: { message: "LPU requests are temporarily limited.", retryAt: cooldownUntil } };
        const localPause = consume(ip);
        if (localPause) return { status: 429, body: { message: "Profile checks are paused to limit upstream requests.", retryAt: localPause } };
        let response;
        try {
          response = await fetchUpstream(UPSTREAM + encodeURIComponent(id), { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(20_000), redirect: "manual" });
        } catch (error) {
          console.warn("Public LPU relay upstream request failed:", error instanceof Error ? error.message : "Network error");
          if (!attempt) { await sleep(1000); continue; }
          return { status: 502, body: { message: "The LPU profile service could not be reached. Your saved data remains available." } };
        }
        if (response.status === 429) {
          cooldownUntil = Math.max(cooldownUntil, retryAt(response.headers));
          return { status: 429, body: { message: "LPU requests are temporarily limited. Your saved data remains available.", retryAt: cooldownUntil } };
        }
        if ([500, 502, 503, 504].includes(response.status) && !attempt) { await response.body?.cancel(); await sleep(1000); continue; }
        if (!response.ok) return { status: response.status === 404 ? 404 : 502, body: { message: response.status === 404 ? "That public LPU profile could not be found." : "LPU could not return that profile. Your saved data remains available." } };
        let upstream;
        try { upstream = await response.json(); } catch { return { status: 502, body: { message: "LPU returned an unreadable profile response." } }; }
        const data = upstream?.data;
        if (data?.userId !== id || !["own", "wishlist", "picked"].every((key) => Array.isArray(data.collections?.[key]) && data.collections[key].every((value) => typeof value === "string")))
          return { status: 502, body: { message: "LPU returned incomplete profile data. Your saved data remains available." } };
        // Forward only the public contract, never future private fields.
        const collections = Object.fromEntries(PUBLIC_COLLECTIONS.filter((key) => Array.isArray(data.collections[key])).map((key) => [key, data.collections[key].filter((value) => typeof value === "string")]));
        const fetchedAt = now();
        const result = { status: 200, fetchedAt, body: { data: { userId: id, displayName: typeof data.displayName === "string" ? data.displayName : "", collections }, metadata: { fetchedDateTime: new Date(fetchedAt).toISOString() } } };
        if (cache.size >= 200) cache.delete(cache.keys().next().value);
        cache.set(id, { result, until: fetchedAt + CACHE_MS });
        return result;
      }
    })().finally(() => pending.delete(id));
    pending.set(id, work);
    return work;
  }
  return {
    async fetch(request) {
      const url = new URL(request.url);
      const origin = request.headers.get("origin");
      const allowed = !origin || origin === GITHUB_ORIGIN || origin === url.origin;
      const cors = allowed && origin ? { "Access-Control-Allow-Origin": origin, Vary: "Origin", "Access-Control-Expose-Headers": "Retry-After, X-LPU-Fetched-At" } : {};
      const reply = (body, status = 200, extra = {}) => Response.json(body, { status, headers: { ...cors, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...extra } });
      if (url.pathname === "/" || url.pathname === "/health") return reply({ service: "LPU Analytics public profile relay", status: "ready", readOnly: true });
      if (url.pathname !== "/api/lpu-user") return reply({ message: "Not found." }, 404);
      if (!allowed) return reply({ message: "Origin not allowed." }, 403);
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...cors, "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "Accept", "Access-Control-Max-Age": "86400" } });
      if (request.method !== "GET") return reply({ message: "Only public profile reads are supported." }, 405, { Allow: "GET, OPTIONS" });
      const id = url.searchParams.get("userId") || "";
      if (!/^[A-Za-z0-9_-]{20,128}$/.test(id)) return reply({ message: "A valid public LPU user ID is required." }, 400);
      const result = await readProfile(id, request.headers.get("cf-connecting-ip") || "unknown");
      return reply(result.body, result.status, {
        ...(result.fetchedAt ? { "X-LPU-Fetched-At": String(result.fetchedAt) } : {}),
        ...(result.body.retryAt ? { "Retry-After": String(Math.max(1, Math.ceil((result.body.retryAt - now()) / 1000))) } : {}),
      });
    },
  };
}

export default createRelay();
