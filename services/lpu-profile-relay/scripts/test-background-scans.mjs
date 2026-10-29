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
const snapshots = new Map();
const storage = () => { const values = new Map(); return { getItem: k => values.get(k) || null, setItem: (k,v) => values.set(k,v), removeItem: k => values.delete(k) }; };
const browser = { location: { hostname: "gnarly-todd.github.io" }, localStorage: storage(), sessionStorage: storage(), setTimeout, clearTimeout, addEventListener() {}, removeEventListener() {} };
class RateError extends Error { constructor(retryAt) { super("cooldown"); this.retryAt = retryAt; } }
function client() {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync("app/cloud-owner-scans.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    module, exports: module.exports, window: browser, document: { addEventListener() {}, removeEventListener() {} },
    crypto: webcrypto, AbortSignal, Date, Map, fetch: (url, init) => api(url.replace(origin, ""), init),
    require: name => name === "./lpu-request" ? { LpuRateLimitError: RateError } : { hydrateOwnerCache: async () => {}, readOwnerCache: id => snapshots.get(id), writeOwnerCache: async snapshot => snapshots.set(snapshot.id, snapshot) },
  });
  return module.exports;
}
const candidates = ids.map(id => ({ id }));
const controller = new AbortController();
let firstProgress;
const scan = client().loadCloudOwnerSnapshots("selected-profile", candidates, { signal: controller.signal, onProgress: p => firstProgress = p }).catch(() => {});
for (let i=0; i<100 && !firstProgress; i++) await new Promise(r=>setTimeout(r,1));
await new Promise(r => setTimeout(r, 20));
const saved = client().readCloudScan("selected-profile");
assert(saved, "Background job identity persists before submission");
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
await client().loadCloudOwnerSnapshots("selected-profile", candidates, { signal: new AbortController().signal, onProgress: p => restored = p });
assert.equal(restored.snapshots.length, 450);
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
