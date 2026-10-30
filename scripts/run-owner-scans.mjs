import { pathToFileURL } from "node:url";
const origin = "https://todd-lpu-profile-relay.nicelife70117.chatgpt.site";
export async function drainScans({ check, wait = ms => new Promise(resolve => setTimeout(resolve, ms)), now = Date.now, durationMs = 150 * 60_000 }) {
  const deadline = now() + durationMs;
  let pending = true;
  while (now() < deadline) {
    const result = await check();
    console.log(JSON.stringify({ status: result.status, processed: result.processed ?? 0, pending: result.pending ?? null, retryAt: result.retryAt || null }));
    pending = result.pending !== 0;
    if (!pending) return false;
    // Keep this runner alive through cooldowns. Never send LPU requests early.
    const delay = result.retryAt > now() ? Math.min(60_000, result.retryAt - now()) : 15_000;
    await wait(Math.min(delay, Math.max(0, deadline - now())));
  }
  return pending;
}
async function check() {
  // Renew identity on each call: OIDC tokens expire during a long cooldown.
  const url = new URL(process.env.ACTIONS_ID_TOKEN_REQUEST_URL);
  url.searchParams.set("audience", origin);
  const identity = await fetch(url, { headers: { Authorization: `Bearer ${process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}` }, signal: AbortSignal.timeout(15_000) });
  if (!identity.ok) throw new Error(`Runner identity failed: ${identity.status}`);
  const { value } = await identity.json();
  const response = await fetch(`${origin}/api/owner-scans/tick`, { method: "POST", headers: { Authorization: `Bearer ${value}` }, signal: AbortSignal.timeout(100_000) });
  if (!response.ok) throw new Error(`Background queue check failed: ${response.status}`);
  return response.json();
}
async function main() {
  let failures = 0;
  const pending = await drainScans({ check: async () => {
    try { const result = await check(); failures = 0; return result; }
    catch(error) {
      if (++failures >= 10) throw error;
      console.warn("Queue connection interrupted; retrying in one minute.");
      return { status: "reconnecting", pending: 1, retryAt: Date.now() + 60_000 };
    }
  } });
  if (pending) {
    // Hand off before the execution limit; no separate cron start is needed.
    const response = await fetch("https://api.github.com/repos/gnarly-todd/LPUAnalytics/actions/workflows/owner-scans.yml/dispatches", {
      method: "POST", headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
      body: JSON.stringify({ ref: "main" }), signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Runner handoff failed: ${response.status}`);
    console.log("Remaining work handed to the next runner.");
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
