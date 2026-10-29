const GITHUB_ORIGIN = "https://gnarly-todd.github.io";
const UPSTREAM = "https://api.lpubelts.com/api/v1/users/";
const WINDOW_MS = 20 * 60 * 1000;
const CACHE_MS = 30_000;
const PUBLIC_COLLECTIONS = ["own", "wishlist", "picked", "recorded", "recordedLocks", "scorecard", "safelocksOwn", "safelocksCracked", "safelocksWishlist"];

export function createRelay({ fetchUpstream = fetch, now = Date.now, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
  const cache = new Map();
  const pending = new Map();
  let cooldownUntil = 0;
  const retryAt = (headers) => {
    const value = headers.get("retry-after");
    const numeric = value ? Number(value) : NaN;
    const date = Number.isFinite(numeric) ? now() + Math.max(0, numeric) * 1000 : Date.parse(value || "");
    return Number.isFinite(date) && date > now() ? date : now() + WINDOW_MS;
  };
  async function readProfile(id) {
    const saved = cache.get(id);
    if (saved?.until > now()) return saved.result;
    if (cooldownUntil > now()) return { status: 429, body: { message: "LPU requests are temporarily limited. Saved results remain available.", retryAt: cooldownUntil } };
    if (pending.has(id)) return pending.get(id);
    const work = (async () => {
      for (let attempt = 0; attempt < 2; attempt++) {
        if (cooldownUntil > now()) return { status: 429, body: { message: "LPU requests are temporarily limited.", retryAt: cooldownUntil } };
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
    readProfile,
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
      const result = await readProfile(id);
      return reply(result.body, result.status, {
        ...(result.fetchedAt ? { "X-LPU-Fetched-At": String(result.fetchedAt) } : {}),
        ...(result.body.retryAt ? { "Retry-After": String(Math.max(1, Math.ceil((result.body.retryAt - now()) / 1000))) } : {}),
      });
    },
  };
}



// Durable scans: only the pinned GitHub workflow can advance the queue.
const SCAN_ORIGIN = "https://todd-lpu-profile-relay.nicelife70117.chatgpt.site";
const SCAN_TTL = 7 * 86400_000;
const validId = value => typeof value === "string" && /^[A-Za-z0-9_-]{20,128}$/.test(value);
const validJob = value => typeof value === "string" && /^[a-f0-9-]{36}$/.test(value);
const decode64 = value => Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
let githubKeys;
export async function verifyScanRunner(request, fetchKeys = fetch, now = Date.now()) {
  try {
    const token = (request.headers.get("authorization") || "").replace(/^Bearer /, "");
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const header = JSON.parse(new TextDecoder().decode(decode64(parts[0])));
    const claims = JSON.parse(new TextDecoder().decode(decode64(parts[1])));
    if (header.alg !== "RS256" || claims.iss !== "https://token.actions.githubusercontent.com" || claims.aud !== SCAN_ORIGIN ||
      claims.repository !== "gnarly-todd/LPUAnalytics" || claims.ref !== "refs/heads/main" ||
      claims.workflow_ref !== "gnarly-todd/LPUAnalytics/.github/workflows/owner-scans.yml@refs/heads/main" ||
      !["push", "schedule", "workflow_dispatch"].includes(claims.event_name) ||
      !Number.isFinite(claims.exp) || claims.exp * 1000 <= now || !Number.isFinite(claims.nbf) || claims.nbf * 1000 > now + 30_000) return false;
    if (!githubKeys || githubKeys.until < now || !githubKeys.keys.some(k => k.kid === header.kid)) {
      const response = await fetchKeys("https://token.actions.githubusercontent.com/.well-known/jwks", { signal: AbortSignal.timeout(10_000) });
      if (!response.ok) return false;
      githubKeys = { ...(await response.json()), until: now + 3600_000 };
    }
    const jwk = githubKeys.keys.find(k => k.kid === header.kid);
    if (!jwk) return false;
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    return await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, decode64(parts[2]), new TextEncoder().encode(parts.slice(0, 2).join(".")));
  } catch { return false; }
}

export function createScanQueue({ readProfile, now = Date.now, authorize = verifyScanRunner } = {}) {
  const read = async (bucket, key) => { const object = await bucket.get(key); return object ? object.json() : null; };
  const put = (bucket, key, value, options = {}) => bucket.put(key, JSON.stringify(value), { httpMetadata: { contentType: "application/json" }, ...options });
  const isFresh = snapshot => snapshot && Number.isFinite(snapshot.fetchedAt) && snapshot.fetchedAt <= now() && snapshot.fetchedAt > now() - SCAN_TTL;
  async function tick(bucket) {
    const lock = await bucket.get("state/scan-lease");
    if (lock && (await lock.json()).until > now()) return { status: "already-running" };
    const lease = await put(bucket, "state/scan-lease", { until: now() + 120_000 }, { onlyIf: lock ? { etagMatches: lock.etag } : { etagDoesNotMatch: "*" } });
    if (!lease) return { status: "already-running" };
    try {
      const housekeeping = await read(bucket, "state/scan-cleanup");
      if (!housekeeping || housekeeping.nextAt <= now()) {
        const cursors = housekeeping?.cursors || {};
        for (const prefix of ["owners/", "jobs/", "cancelled/"]) {
          const page = await bucket.list({ prefix, limit: 100, ...(cursors[prefix] ? { cursor: cursors[prefix] } : {}) });
          for (const object of page.objects) if (new Date(object.uploaded).getTime() < now() - SCAN_TTL) await bucket.delete(object.key);
          cursors[prefix] = page.truncated ? page.cursor : undefined;
        }
        await put(bucket, "state/scan-cleanup", { nextAt: now() + 3600_000, cursors });
      }
      const cooldown = await read(bucket, "state/scan-cooldown");
      if (cooldown?.retryAt > now()) return { status: "cooldown", retryAt: cooldown.retryAt };
      const list = await bucket.list({ prefix: "pending/", limit: 1000 });
      const deadline = now() + 25_000;
      let processed = 0;
      for (const entry of list.objects.sort((a, b) => new Date(a.uploaded).getTime() - new Date(b.uploaded).getTime())) {
        const id = entry.key.slice(8);
        const job = await read(bucket, `jobs/${id}`);
        if (!job || job.createdAt < now() - SCAN_TTL || await bucket.head(`cancelled/${id}`)) {
          await bucket.delete(entry.key);
          if (job && job.createdAt < now() - SCAN_TTL) await bucket.delete(`jobs/${id}`);
          continue;
        }
        const done = new Set(job.done);
        const pending = job.ids.filter(id => !done.has(id) && !job.errors[id]);
        job.state = "running";
        job.retryAt = 0;
        while (pending.length && processed < 50 && now() < deadline) {
          if (await bucket.head(`cancelled/${id}`)) { job.state = "cancelled"; break; }
          let rateAt = 0;
          const batch = pending.splice(0, Math.min(3, 50 - processed));
          await Promise.all(batch.map(async ownerId => {
            const saved = await read(bucket, `owners/${ownerId}`);
            if (!job.force && isFresh(saved)) { done.add(ownerId); job.cached++; return; }
            let result;
            try { result = await readProfile(ownerId); } catch { result = { status: 502 }; }
            if (result.status === 429) { rateAt = Math.max(rateAt, result.body?.retryAt || now() + WINDOW_MS); return; }
            const data = result.body?.data;
            if (result.status !== 200 || !data?.displayName?.trim() || /^(no display name|anonymous|unnamed|undefined|null)$/i.test(data.displayName.trim())) {
              const attempts = (job.attempts[ownerId] || 0) + 1;
              job.attempts[ownerId] = attempts;
              if (result.status === 404 || attempts >= 3) job.errors[ownerId] = "This public profile could not be loaded.";
              return;
            }
            const snapshot = { id: ownerId, name: data.displayName.trim(), own: data.collections.own, fetchedAt: result.fetchedAt || now() };
            await put(bucket, `owners/${ownerId}`, snapshot);
            done.add(ownerId);
            job.fresh++;
          }));
          processed += batch.length;
          job.done = [...done];
          job.updatedAt = now();
          if (rateAt) {
            job.state = "cooldown";
            job.retryAt = rateAt;
            await put(bucket, "state/scan-cooldown", { retryAt: rateAt });
          }
          if (await bucket.head(`cancelled/${id}`)) job.state = "cancelled";
          await put(bucket, `jobs/${id}`, job);
          if (rateAt || job.state === "cancelled") break;
        }
        if (job.state !== "cancelled" && job.done.length + Object.keys(job.errors).length === job.ids.length) job.state = "complete";
        job.updatedAt = now();
        await put(bucket, `jobs/${id}`, job);
        if (["complete", "cancelled"].includes(job.state)) await bucket.delete(entry.key);
        if (job.retryAt > now() || processed >= 50 || now() >= deadline) break;
      }
      return { status: "checked", processed };
    } finally {
      await put(bucket, "state/scan-lease", { until: 0 }, { onlyIf: { etagMatches: lease.etag } });
    }
  }
  return {
    async fetch(request, env) {
      const url = new URL(request.url);
      const origin = request.headers.get("origin");
      const allowed = !origin || ["https://gnarly-todd.github.io", "https://todd-lock-analytics.nicelife70117.chatgpt.site", "http://terminal.local:4173", SCAN_ORIGIN].includes(origin);
      const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...(allowed && origin ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}) };
      const reply = (body, status = 200) => Response.json(body, { status, headers });
      if (!allowed) return reply({ message: "Origin not allowed." }, 403);
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...headers, "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Max-Age": "86400" } });
      if (!env?.BUCKET) return reply({ message: "Background scan storage is not available." }, 503);
      const bucket = env.BUCKET;
      if (url.pathname === "/api/owner-scans/tick") {
        if (request.method !== "POST" || !await authorize(request)) return reply({ message: "Runner authorization required." }, 403);
        return reply(await tick(bucket));
      }
      if (url.pathname === "/api/owner-scans" && request.method === "POST") {
        if (Number(request.headers.get("content-length")) > 2_000_000) return reply({ message: "Scan request is too large." }, 413);
        const text = await request.text();
        if (text.length > 2_000_000) return reply({ message: "Scan request is too large." }, 413);
        let body; try { body = JSON.parse(text); } catch { return reply({ message: "Invalid scan request." }, 400); }
        if (!validJob(body.id) || !Array.isArray(body.ids) || !body.ids.length || !body.ids.every(validId) || typeof body.force !== "boolean") return reply({ message: "Valid public profile IDs are required." }, 400);
        const existing = await read(bucket, `jobs/${body.id}`);
        if (existing) return reply({ id: body.id, state: existing.state }, 200);
        const job = { id: body.id, ids: [...new Set(body.ids)], force: body.force, state: "queued", done: [], errors: {}, attempts: {}, fresh: 0, cached: 0, retryAt: 0, createdAt: now(), updatedAt: now() };
        await put(bucket, `jobs/${body.id}`, job);
        // The runner reads pending entries independently of browser sessions.
        await put(bucket, `pending/${body.id}`, { createdAt: job.createdAt });
        return reply({ id: body.id, state: "queued" }, 202);
      }
      const match = url.pathname.match(/^\/api\/owner-scans\/([a-f0-9-]{36})$/);
      if (!match) return reply({ message: "Not found." }, 404);
      const id = match[1];
      const job = await read(bucket, `jobs/${id}`);
      if (!job || job.createdAt < now() - SCAN_TTL) return reply({ message: "This background scan has expired." }, 404);
      if (request.method === "DELETE") {
        await put(bucket, `cancelled/${id}`, { cancelledAt: now() });
        await bucket.delete(`pending/${id}`);
        return reply({ id, state: "cancelled" });
      }
      if (request.method !== "GET") return reply({ message: "Method not allowed." }, 405);
      const cursor = Math.max(0, Number(url.searchParams.get("cursor")) || 0);
      if (!Number.isSafeInteger(cursor)) return reply({ message: "Invalid cursor." }, 400);
      const page = job.done.slice(cursor, cursor + 25);
      const snapshots = (await Promise.all(page.map(ownerId => read(bucket, `owners/${ownerId}`)))).filter(Boolean);
      const cancelled = await bucket.head(`cancelled/${id}`);
      return reply({ id, state: cancelled ? "cancelled" : job.state, total: job.ids.length, processed: job.done.length + Object.keys(job.errors).length, fresh: job.fresh, cached: job.cached, errors: job.errors, retryAt: job.retryAt, updatedAt: job.updatedAt, snapshots, nextCursor: cursor + page.length, hasMore: cursor + page.length < job.done.length });
    },
  };
}

const publicRelay = createRelay();
const scanQueue = createScanQueue({ readProfile: publicRelay.readProfile });
export default {
  fetch(request, env) {
    return new URL(request.url).pathname.startsWith("/api/owner-scans")
      ? scanQueue.fetch(request, env)
      : publicRelay.fetch(request);
  },
};
