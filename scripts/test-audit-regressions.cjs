// Bugs found in the codebase review: settings fallback and safe snapshot refresh.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const store = () => {
  const map = new Map();
  return { getItem: (key) => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) };
};
const local = store(),
  session = store();
let blocked = false;
const window = {
  get localStorage() {
    if (blocked) throw Error("Blocked");
    return local;
  },
  sessionStorage: session,
};
const mod = { exports: {} };
vm.runInNewContext(
  ts.transpileModule(fs.readFileSync(path.join(root, "app/profile-storage.ts"), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  { window, module: mod, exports: mod.exports },
);
const settings = mod.exports.profileStorage;
local.setItem("active", "legacy");
assert.equal(settings.getItem("active"), "legacy");
settings.setItem("active", "new");
assert.equal(settings.getItem("active"), "new");
blocked = true;
settings.setItem("active", "fallback");
assert.equal(settings.getItem("active"), "fallback");
settings.removeItem("active");
blocked = false;
assert.equal(
  settings.getItem("active"),
  null,
  "Session tombstone must hide older local/legacy values",
);
Object.defineProperty(window, "sessionStorage", {
  get() {
    throw Error("Blocked");
  },
});
blocked = true;
assert.equal(settings.getItem("missing"), null);
assert.throws(() => settings.setItem("active", "lost"), /could not save profile settings/);

(async () => {
  const { shouldRefreshProfile } = await import("./refresh-schedule.mjs");
  for (const [date, schedule, expected] of [
    ["2026-07-15T23:00:00Z", "0 12 * * *", true],
    ["2026-07-15T23:00:00Z", "0 13 * * *", false],
    ["2026-01-15T20:00:00Z", "0 12 * * *", false],
    ["2026-01-15T20:00:00Z", "0 13 * * *", true],
    ["2026-03-08T19:00:00Z", "0 12 * * *", true],
    ["2026-11-01T19:00:00Z", "0 13 * * *", true],
  ]) {
    assert.equal(shouldRefreshProfile("schedule", schedule, new Date(date)), expected);
  }
  assert.equal(shouldRefreshProfile("workflow_dispatch", "", new Date()), true);
  assert.equal(shouldRefreshProfile("schedule", "unknown", new Date()), true);
  const source = fs
    .readFileSync(path.join(root, "scripts/refresh-profile.mjs"), "utf8")
    .replace('import { readFile, writeFile } from "node:fs/promises";', "")
    .replaceAll("import.meta.url", '"file:///project/scripts/refresh-profile.mjs"');
  for (const collections of [
    { picked: [] },
    { own: [], picked: [] },
    { own: ["lock"], wishlist: [], picked: [3] },
  ]) {
    let writes = 0;
    const data = { data: { userId: "84dULJFIN4bHIC1LxCiuvBCSqT43", collections } };
    await assert.rejects(
      vm.runInNewContext(`(async()=>{${source}})()`, {
        URL,
        AbortSignal,
        console,
        fetch: async (url) => Response.json(url.includes("/users/") ? data : []),
        readFile: async () => "",
        writeFile: async () => {
          writes++;
        },
      }),
      /missing valid/,
    );
    assert.equal(writes, 0, "Incomplete upstream data must never replace a valid snapshot");
  }
  console.log(
    "PASS: legacy settings migration, blocked storage fallback, stale-value tombstones, delayed refresh scheduling through daylight saving, and incomplete refresh snapshots retained.",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
