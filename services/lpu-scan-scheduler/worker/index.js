const RELAY_ORIGIN = "https://todd-lpu-profile-relay.nicelife70117.chatgpt.site";
const RESUME_DELAY_MS = 2_000;
const RETRY_MIN_MS = 5_000;
const RETRY_MAX_MS = 60_000;

// Compare fixed-length digests rather than the secret text itself.
export async function authorized(request, secret) {
  if (typeof secret !== "string" || secret.length < 32) return false;
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) return false;
  const encode = new TextEncoder();
  const [supplied, expected] = await Promise.all(
    [header.slice(7), secret].map(
      async (value) => new Uint8Array(await crypto.subtle.digest("SHA-256", encode.encode(value))),
    ),
  );
  let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= supplied[i] ^ expected[i];
  return difference === 0;
}

export function createScheduler(state, env, { now = Date.now, send = fetch } = {}) {
  const storage = state.storage;
  return {
    async wake() {
      const next = await storage.getAlarm();
      const soon = now() + 1_000;
      if (next === null || next <= now() || next > soon) await storage.setAlarm(soon);
    },
    async run() {
      try {
        if (typeof env.SCAN_TICK_SECRET !== "string" || env.SCAN_TICK_SECRET.length < 32)
          throw new Error("The scan runner secret is not configured.");
        const response = await send(`${RELAY_ORIGIN}/api/owner-scans/tick`, {
          method: "POST",
          headers: { Authorization: `Bearer ${env.SCAN_TICK_SECRET}` },
          signal: AbortSignal.timeout(45_000),
        });
        if (!response.ok) throw new Error(`Scan service returned ${response.status}.`);
        const result = await response.json();
        if (!Number.isSafeInteger(result.pending) || result.pending < 0)
          throw new Error("Scan service returned invalid queue status.");
        await storage.delete("failures");
        if (result.pending > 0) {
          const retryAt = Number.isFinite(result.retryAt) ? result.retryAt : 0;
          await storage.setAlarm(Math.max(now() + RESUME_DELAY_MS, retryAt));
        }
      } catch (error) {
        const failures = Math.min(10, ((await storage.get("failures")) || 0) + 1);
        await storage.put("failures", failures);
        await storage.setAlarm(now() + Math.min(RETRY_MAX_MS, RETRY_MIN_MS * 2 ** (failures - 1)));
        console.warn(
          "Background scan scheduler will retry:",
          error instanceof Error ? error.message : "unexpected error",
        );
      }
    },
  };
}

export class ScanScheduler {
  constructor(state, env) {
    this.scheduler = createScheduler(state, env);
  }
  async fetch() {
    await this.scheduler.wake();
    return Response.json({ state: "scheduled" }, { status: 202 });
  }
  async alarm() {
    await this.scheduler.run();
  }
}

function coordinator(env) {
  return env.SCAN_SCHEDULER.get(env.SCAN_SCHEDULER.idFromName("global"));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/wake" || request.method !== "POST")
      return new Response("Not found", { status: 404 });
    if (!(await authorized(request, env.SCAN_WAKE_SECRET)))
      return new Response("Unauthorized", { status: 403 });
    return coordinator(env).fetch("https://scheduler.internal/wake", { method: "POST" });
  },
  scheduled(_event, env, ctx) {
    // A separate watchdog recovers jobs if a wake request or alarm was lost.
    ctx.waitUntil(coordinator(env).fetch("https://scheduler.internal/wake", { method: "POST" }));
  },
};
