import assert from "node:assert/strict";
import { createScanQueue, verifyScanRunner } from "../worker/index.js";
import { randomUUID, webcrypto } from "node:crypto";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("../../../node_modules/typescript");
class Bucket {
  values = new Map();
  async get(key) { const value = this.values.get(key); return value ? { etag: value.etag, json: async () => structuredClone(value.body) } : null; }
  async head(key) { return this.values.has(key) ? {} : null; }
  async put(key, body, options = {}) {
    const previous = this.values.get(key);
    if (options.onlyIf?.etagMatches && previous?.etag !== options.onlyIf.etagMatches) return null;
    if (options.onlyIf?.etagDoesNotMatch === "*" && previous) return null;
    const value = { etag: randomUUID(), body: JSON.parse(body), uploaded: new Date() };
    this.values.set(key, value); return { etag: value.etag };
  }
  async delete(key) { this.values.delete(key); }
  async list({ prefix, limit }) { return { objects: [...this.values].filter(([key]) => key.startsWith(prefix)).slice(0, limit).map(([key, value]) => ({ key, uploaded: value.uploaded })) }; }
}
let now = Date.now(), calls = 0, limited = true, active = 0, peak = 0;
const bucket = new Bucket();
const queue = createScanQueue({ now: () => now, authorize: async () => true, readProfile: async id => {
  calls++; active++; peak = Math.max(peak, active);
  await new Promise(r => setTimeout(r, 1)); active--;
  if (limited && calls > 6) return { status: 429, body: { retryAt: now + 1200_000 } };
  return { status: 200, fetchedAt: now, body: { data: { userId: id, displayName: `Owner ${id}`, collections: { own: ["wanted-lock"] } } } };
} });
const origin = "https://todd-lpu-profile-relay.nicelife70117.chatgpt.site";
const api = (path, init) => queue.fetch(new Request(origin + path, init), { BUCKET: bucket });
const tick = async () => (await api("/api/owner-scans/tick", { method: "POST" })).json();
const ids = Array.from({ length: 450 }, (_, i) => `background-owner-id-${String(i).padStart(4,"0")}`);
let failNextPoll = false;
const snapshots = new Map();
const storage = () => { const values = new Map(); return { getItem: k => values.get(k) || null, setItem: (k,v) => values.set(k,v), removeItem: k => values.delete(k) }; };
const browser = { location: { hostname: "gnarly-todd.github.io" }, localStorage: storage(), sessionStorage: storage(), setTimeout, clearTimeout, addEventListener() {}, removeEventListener() {} };
class RateError extends Error { constructor(retryAt) { super("cooldown"); this.retryAt = retryAt; } }
function client() {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync("app/cloud-owner-scans.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    module, exports: module.exports, window: browser, document: { addEventListener() {}, removeEventListener() {} },
    crypto: webcrypto, AbortSignal, Date, Map, fetch: (url, init) => {
      if (failNextPoll && url.includes("cursor=")) { failNextPoll = false; return Promise.reject(new Error("Connection discarded during lock")); }
      return api(url.replace(origin, ""), init);
    },
    require: name => name === "./lpu-request" ? { LpuRateLimitError: RateError } : { hydrateOwnerCache: async () => {}, readOwnerCache: id => snapshots.get(id), writeOwnerCache: async snapshot => snapshots.set(snapshot.id, snapshot) },
  });
  return module.exports;
}
const candidates = ids.map(id => ({ id }));
const controller = new AbortController();
let firstProgress;
const initialStates = [];
const scan = client().loadCloudOwnerSnapshots("selected-profile", candidates, { signal: controller.signal, onProgress: p => { firstProgress = p; initialStates.push(p.backgroundState); } }).catch(() => {});
for (let i=0; i<100 && !firstProgress; i++) await new Promise(r=>setTimeout(r,1));
await new Promise(r => setTimeout(r, 20));
const saved = client().readCloudScan("selected-profile");
assert(saved, "Background job identity persists before submission");
assert.equal(initialStates[0], "submitting", "The app does not claim the job is queued before server acknowledgement");
assert(initialStates.includes("queued"));
controller.abort(); await scan;
assert.equal(calls, 0, "The browser does not fetch owner profiles");
await tick();
assert.equal(peak, 3);
const pausedCalls = calls;
const paused = await tick();
assert.equal(paused.status, "cooldown"); assert.equal(calls, pausedCalls);
const job = await (await api(`/api/owner-scans/${saved.id}`)).json();
assert.equal(job.processed, 6); assert.equal(job.state, "cooldown");
limited = false; now += 1200_001;
for (let i=0; i<10; i++) await tick();
const complete = await (await api(`/api/owner-scans/${saved.id}`)).json();
assert.equal(complete.processed, 450); assert.equal(complete.state, "complete");
assert.equal(complete.snapshots.length, 25); assert(complete.hasMore);
const beforeReturn = calls;
let restored;
failNextPoll = true;
browser.setTimeout = (callback, ms) => setTimeout(callback, Math.min(ms, 10));
await client().loadCloudOwnerSnapshots("selected-profile", candidates, { signal: new AbortController().signal, onProgress: p => restored = p });
assert.equal(restored.snapshots.length, 450);
assert.equal(restored.serverProgress.total, 450);
assert.equal(restored.serverProgress.processed, 450);
assert.equal(restored.serverProgress.fresh, 450);
assert.equal(restored.serverProgress.failed, 0);
assert.equal(restored.serverProgress.updatedAt, now);
assert(restored.serverProgress.checkedAt > 0);
assert.equal(snapshots.size, 450); assert.equal(calls, beforeReturn);
assert.equal(client().readCloudScan("selected-profile"), null);
// Idempotent creates and independent cache-first scans reuse server snapshots.
const secondId = randomUUID();
for(let i=0;i<2;i++) await api("/api/owner-scans", { method: "POST", body: JSON.stringify({ id: secondId, ids, force:false }) });
for(let i=0;i<9;i++) await tick();
assert.equal(calls, beforeReturn);
assert.equal((await (await api(`/api/owner-scans/${secondId}`)).json()).processed, 450);
const cancelId = randomUUID();
await api("/api/owner-scans", { method: "POST", body: JSON.stringify({ id: cancelId, ids, force:true }) });
await api(`/api/owner-scans/${cancelId}`, { method: "DELETE" }); await tick();
assert.equal(calls, beforeReturn); assert.equal((await (await api(`/api/owner-scans/${cancelId}`)).json()).state, "cancelled");
assert.equal((await api("/api/owner-scans", { method:"POST", body:"garbage" })).status, 400);
assert.equal((await api(`/api/owner-scans/${saved.id}`, { headers:{ Origin:"https://untrusted.invalid" } })).status, 403);
assert.equal((await createScanQueue({}).fetch(new Request(origin+"/api/owner-scans/tick", {method:"POST"}), { BUCKET:bucket })).status, 403);
console.log("PASS: 450-profile scan continues after browser abort, durable cooldown, three-worker bound, completion without browser, pagination, reload restoration, idempotence, shared cache, cancellation and CORS.");
// Verify the actual signature and pinning policy, including tampering/expiry.
const keys = await crypto.subtle.generateKey({name:"RSASSA-PKCS1-v1_5",modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:"SHA-256"}, true, ["sign","verify"]);
const jwk = { ...await crypto.subtle.exportKey("jwk",keys.publicKey), kid: randomUUID() };
const claims = { iss:"https://token.actions.githubusercontent.com",aud:origin,repository:"gnarly-todd/LPUAnalytics",ref:"refs/heads/main",workflow_ref:"gnarly-todd/LPUAnalytics/.github/workflows/owner-scans.yml@refs/heads/main",event_name:"push",nbf:Math.floor(Date.now()/1000)-10,exp:Math.floor(Date.now()/1000)+300 };
async function signed(overrides={}) { const parts=[{alg:"RS256",kid:jwk.kid},{...claims,...overrides}].map(x=>Buffer.from(JSON.stringify(x)).toString("base64url")); const signature=await crypto.subtle.sign("RSASSA-PKCS1-v1_5",keys.privateKey,new TextEncoder().encode(parts.join("."))); return [...parts,Buffer.from(signature).toString("base64url")].join("."); }
const check = async token => verifyScanRunner(new Request(origin,{headers:{Authorization:`Bearer ${token}`}}),async()=>Response.json({keys:[jwk]}));
assert(await check(await signed()));
for(const override of [{repository:"other/repo"},{workflow_ref:"gnarly-todd/LPUAnalytics/.github/workflows/pages.yml@refs/heads/main"},{exp:1},{aud:"other"},{ref:"refs/heads/other"}]) assert(!await check(await signed(override)));
assert(!await check((await signed()).slice(0,-10)+"tampered"));
console.log("PASS: GitHub OIDC signature verification, workflow/repository/branch/audience pinning, expired and forged runner rejection.");

// Progress UI uses server counts, rather than inferring completion from downloaded pages.
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const progressModule = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync("app/server-scan-progress.tsx", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText, {
  module: progressModule, exports: progressModule.exports,
  require: name => name === "./activity-status" ? { DataTimestamp: ({value}) => React.createElement("time", null, String(value)) } : require(name),
});
const Panel = progressModule.exports.default;
const progress = { total: 450, processed: 125, fresh: 100, cached: 20, failed: 5, updatedAt: 1000, checkedAt: 2000, retryAt: 67000 };
const renderPanel = (state, data=progress, busy=true, clock=2000) => renderToStaticMarkup(React.createElement(Panel, {state, progress:data, busy, now:clock}));
const runningHtml = renderPanel("running");
assert(runningHtml.includes("125 of 450 profiles checked"));
assert(runningHtml.includes("27%"));
assert(runningHtml.includes("325 remaining"));
assert(runningHtml.includes("Server cache"));
assert(runningHtml.includes("Last server update"));
assert(runningHtml.includes("Last status received"));
assert(renderPanel("cooldown").includes("1m 05s"));
assert(renderPanel("cooldown",progress,true,68000).includes("Cooldown ended"));
assert(renderPanel("reconnecting").includes("Showing the last received progress"));
assert(renderPanel("complete",{...progress,processed:450},false).includes("Complete with failures"));
assert(renderPanel("cancelled",progress,false).includes("Stopped"));
const sending = renderToStaticMarkup(React.createElement(Panel, {state:"submitting",busy:true}));
assert(sending.includes("Wait for server confirmation"));
assert(!sending.includes("You can lock your phone"));
assert(!sending.includes("0 of 0"));
console.log("PASS: exact server progress counts, percentage, remaining, failure totals, timestamps, live cooldown formatting, reconnecting, complete and stopped states.");

// A single runner must keep processing after the first 50 and through cooldowns.
const { drainScans } = await import("../../../scripts/run-owner-scans.mjs");
let runnerNow = 0, runnerChecks = 0;
const results = [
  { status: "checked", processed: 50, pending: 1 },
  { status: "cooldown", pending: 1, retryAt: 120000 },
  { status: "cooldown", pending: 1, retryAt: 120000 },
  { status: "checked", processed: 50, pending: 1 },
  { status: "checked", processed: 50, pending: 0 },
];
const moreWork = await drainScans({ check: async () => { runnerChecks++; return results.shift(); }, wait: async ms => { runnerNow += ms; }, now: () => runnerNow });
assert.equal(moreWork, false);
assert.equal(runnerChecks, 5, "A runner does not exit after one batch or a cooldown");
assert(runnerNow >= 120000, "Cooldown is not bypassed");
const handoff = await drainScans({ check: async () => ({ status: "checked", pending: 1 }), wait: async ms => { runnerNow += ms; }, now: () => runnerNow, durationMs: 30000 });
assert(handoff, "Pending work requests a handoff before the runner deadline");
const batchId = randomUUID();
const backgroundWork = [];
const beforeBatch = calls;
await queue.fetch(new Request(origin+"/api/owner-scans", { method:"POST", body:JSON.stringify({id:batchId,ids:ids.slice(0,10),force:true}) }), {BUCKET:bucket}, { waitUntil: p => backgroundWork.push(p) });
assert.equal(backgroundWork.length, 1, "Submission starts a batch without waiting for cron");
await Promise.all(backgroundWork);
assert.equal(calls-beforeBatch, 3, "Submission batch is bounded to three requests");
await api(`/api/owner-scans/${batchId}`, { method:"DELETE" });
console.log("PASS: runner drains multiple batches, waits through cooldowns, hands off long jobs, and starts a bounded batch on submission.");
