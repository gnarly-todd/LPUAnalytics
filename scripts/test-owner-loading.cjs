// Network-free regression checks: node scripts/test-owner-loading.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { unzipSync, strFromU8 } = require("fflate");
const root = path.resolve(__dirname, "..");
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const profiles = Array.from({ length: 50 }, (_, n) => ({
  id: `public-profile-id-${String(n).padStart(3, "0")}`,
  name: `Owner ${n}`,
  url: `https://lpubelts.com/#/profile/public-profile-id-${String(n).padStart(3, "0")}`,
  ownedCount: 1000 - n,
}));
const reserveProfile = {
  id: "public-profile-id-050",
  name: "Owner 50",
  url: "https://lpubelts.com/#/profile/public-profile-id-050",
  ownedCount: 950,
};
function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear(),
  };
}
function environment(hooks) {
  const env = {
    window: { localStorage: storage(), sessionStorage: storage(), setTimeout, clearTimeout },
    calls: 0,
    directoryCalls: 0,
    active: 0,
    peak: 0,
    requests: [],
    exports: [],
    downloads: [],
  };
  env.fetch = async (url, options) => {
    if (!url.includes("/api/v1/")) {
      env.directoryCalls++;
      return Response.json({
        data: [...profiles, reserveProfile].map((p) => ({
          id: p.id,
          displayName: p.name,
          own: p.ownedCount,
        })),
        metadata: { updatedDateTime: "2026-10-16" },
      });
    }
    const id = url.split("/").at(-1);
    env.calls++;
    env.active++;
    env.peak = Math.max(env.peak, env.active);
    env.requests.push(id);
    try {
      await wait(3);
      options.signal?.throwIfAborted();
      return Response.json({
        data: {
          userId: id,
          displayName: `Owner ${id.slice(-3)}`,
          collections: {
            own: ["wanted-lock", id, ...Array.from({ length: 64 }, (_, n) => `lock-${n + 1}`)],
          },
        },
      });
    } finally {
      env.active--;
    }
  };
  class BrowserURL extends URL {
    static createObjectURL(blob) {
      env.exports.push(blob);
      return "blob:owner-export";
    }
    static revokeObjectURL() {}
  }
  const document = {
    body: { appendChild() {} },
    createElement() {
      return {
        click() {
          env.downloads.push({ href: this.href, name: this.download });
        },
        remove() {},
      };
    },
  };
  const cache = new Map();
  env.load = (name) => {
    const file = path.resolve(root, name);
    if (file.endsWith(".json")) return JSON.parse(fs.readFileSync(file, "utf8"));
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText;
    const localRequire = (id) => {
      if (id === "react" && hooks) return hooks;
      if (id === "./community-insights")
        return {
          useCommunityInsights: () => ({ data: { demand: {}, statsUpdatedAt: "2026-10-16" } }),
        };
      if (!id.startsWith(".")) return require(id);
      const base = path.resolve(path.dirname(file), id);
      const target = [base, `${base}.ts`, `${base}.tsx`].find((candidate) =>
        fs.existsSync(candidate),
      );
      return env.load(path.relative(root, target));
    };
    vm.runInNewContext(
      code,
      {
        module,
        exports: module.exports,
        require: localRequire,
        window: env.window,
        fetch: (...args) => env.fetch(...args),
        AbortSignal,
        AbortController,
        Response,
        Headers,
        URL: BrowserURL,
        document,
        Blob,
        setTimeout,
        clearTimeout,
        console,
      },
      { filename: file },
    );
    return module.exports;
  };
  env.resetBudget = () =>
    env.window.localStorage.setItem(
      "lpu-request-budget-v1",
      JSON.stringify({ retryAt: 0, attempts: [] }),
    );
  return env;
}
async function queueChecks() {
  const env = environment();
  const api = env.load("app/top-owner-profiles.ts");
  assert.equal(api.TOP_OWNER_LIMIT, 50);
  const ranked = api.selectTopOwners({
    data: [
      ...[...profiles, reserveProfile]
        .reverse()
        .map((p) => ({ id: p.id, displayName: p.name, own: p.ownedCount })),
      { id: "outside-top-fifty-profile", displayName: "Below cutoff", own: 1 },
      { id: "anonymous-profile-id-000", displayName: "No display name", own: 2000 },
    ],
  });
  assert.deepEqual(
    Array.from(ranked.profiles, (p) => p.id),
    [...profiles, reserveProfile].map((p) => p.id),
  );
  for (const activeId of [
    profiles[0].id,
    profiles[49].id,
    reserveProfile.id,
    "outside-top-fifty-profile",
  ]) {
    const candidates = api.selectOwnerCandidates(ranked.profiles, activeId);
    assert.equal(candidates.length, 50, "Always select 50 other profiles");
    assert(!candidates.some((p) => p.id === activeId), "Never include the active profile");
    assert.equal(new Set(candidates.map((p) => p.id)).size, 50);
    assert.deepEqual(
      Array.from(candidates, (p) => p.id),
      [...profiles, reserveProfile]
        .filter((p) => p.id !== activeId)
        .slice(0, 50)
        .map((p) => p.id),
    );
  }
  env.window.localStorage.setItem(
    "lpu-owner-directory-v2",
    JSON.stringify({
      profiles: profiles,
      updatedAt: "2026-10-16",
      fetchedAt: Date.now(),
    }),
  );
  assert.equal(
    api.readOwnerDirectory(),
    null,
    "Old directories without the 51st profile must be refreshed",
  );
  const directory = await api.fetchTopOwners();
  assert.equal(directory.profiles.length, 51);
  assert.equal(api.readOwnerDirectory().profiles.length, 51, "Cache retains the reserve profile");
  await api.fetchTopOwners();
  assert.equal(env.directoryCalls, 1, "New Top 50 directory is cached");
  const updates = [];
  let result = await api.loadOwnerSnapshots([...profiles, profiles[0]], {
    onProgress: (value) => updates.push(value),
  });
  assert.equal(env.calls, 50);
  assert.equal(env.peak, 3);
  assert.equal(result.processed, 50);
  assert.equal(result.fresh, 50);
  assert.equal(result.snapshots.length, 50);
  assert(updates.some((value) => value.snapshots.length > 0 && value.snapshots.length < 50));
  assert.deepEqual(
    Array.from(result.snapshots, (p) => p.id),
    profiles.map((p) => p.id),
  );
  env.calls = 0;
  result = await api.loadOwnerSnapshots(profiles);
  assert.equal(env.calls, 0);
  assert.equal(result.cached, 50);
  assert.equal(result.processed, 50);
  for (const store of [env.window.localStorage, env.window.sessionStorage]) {
    const key = `lpu-top-owner-v1-${profiles[0].id}`;
    const expired = JSON.parse(store.getItem(key));
    expired.fetchedAt -= api.OWNER_CACHE_TTL + 1;
    store.setItem(key, JSON.stringify(expired));
  }
  env.resetBudget();
  result = await api.loadOwnerSnapshots(profiles);
  assert.equal(env.calls, 1);
  assert.equal(result.cached, 49);
  env.calls = 0;
  env.resetBudget();
  result = await api.loadOwnerSnapshots(profiles, { force: true });
  assert.equal(env.calls, 50);
  assert.equal(result.fresh, 50);
  assert.equal(result.cached, 0);
  const original = env.window.localStorage.getItem;
  env.window.localStorage.getItem = () => {
    throw Error("Blocked storage");
  };
  assert(api.readOwnerCache(profiles[0].id));
  env.window.localStorage.getItem = original;

  // Top 50 fits even after recent interactive requests; the local cap still stops more work.
  const budgetEnv = environment();
  const budgetApi = budgetEnv.load("app/top-owner-profiles.ts");
  budgetEnv.window.localStorage.setItem(
    "lpu-request-budget-v1",
    JSON.stringify({
      retryAt: 0,
      attempts: Array.from({ length: 10 }, () => Date.now()),
    }),
  );
  const fullScan = await budgetApi.loadOwnerSnapshots(profiles);
  assert.equal(fullScan.fresh, 50);
  assert(!fullScan.rateLimit);
  const capped = await budgetApi.loadOwnerSnapshots(profiles, { force: true });
  assert(capped.rateLimit?.backgroundOnly);
  assert.equal(budgetEnv.calls, 50);

  const limited = environment();
  limited.fetch = async () => {
    limited.calls++;
    return new Response("", { status: 429, headers: { "Retry-After": "1200" } });
  };
  const limitedApi = limited.load("app/top-owner-profiles.ts");
  const limitedResult = await limitedApi.loadOwnerSnapshots(profiles);
  assert(limitedResult.rateLimit);
  assert(limited.calls <= 3);
  assert(limitedResult.rateLimit.retryAt > Date.now() + 1190_000);
  const before = limited.calls;
  await limitedApi.loadOwnerSnapshots(profiles);
  assert.equal(limited.calls, before);

  const partial = environment();
  const partialApi = partial.load("app/top-owner-profiles.ts");
  partialApi.writeOwnerCache({
    id: profiles[0].id,
    name: "Saved owner",
    own: ["wanted-lock"],
    fetchedAt: Date.now(),
  });
  partial.fetch = async () => new Response("", { status: 404 });
  const partialResult = await partialApi.loadOwnerSnapshots(profiles, { force: true });
  assert.equal(partialResult.snapshots.length, 1);
  assert.equal(Object.keys(partialResult.errors).length, 50);
  const aborted = environment();
  const abortedApi = aborted.load("app/top-owner-profiles.ts");
  const controller = new AbortController();
  let abortedUpdates = 0;
  const promise = abortedApi.loadOwnerSnapshots(profiles, {
    signal: controller.signal,
    onProgress: () => abortedUpdates++,
  });
  controller.abort();
  const lastUpdates = abortedUpdates;
  await assert.rejects(promise, /abort/i);
  assert.equal(abortedUpdates, lastUpdates);
  assert(aborted.calls <= 3);
  console.log(
    "PASS: three-worker bound, incremental results, deduplication, seven-day cache, forced refresh, storage fallback, cooldown, partial errors, abort.",
  );
}
async function componentChecks() {
  const states = [],
    effects = [],
    refs = [];
  let cursor = 0;
  let pending = [];
  const hooks = {
    useState(initial) {
      const i = cursor++;
      if (!(i in states)) states[i] = typeof initial === "function" ? initial() : initial;
      return [
        states[i],
        (value) => {
          states[i] = typeof value === "function" ? value(states[i]) : value;
        },
      ];
    },
    useRef(initial) {
      const i = cursor++;
      return (refs[i] ??= { current: initial });
    },
    useMemo: (callback) => {
      cursor++;
      return callback();
    },
    useEffect(callback, deps) {
      const i = cursor++;
      const previous = effects[i];
      if (!previous || deps.some((value, n) => !Object.is(value, previous.deps[n])))
        pending.push(() => {
          previous?.cleanup?.();
          effects[i] = { deps, cleanup: callback() };
        });
    },
  };
  const env = environment(hooks);
  const Table = env.load("app/wishlist-owner-table.tsx").default;
  let activeProfile = {
    id: "selected-profile-id-000",
    name: "A very long profile name to wrap on a phone",
    url: "https://lpubelts.com",
    refreshedAt: "2026-10-16",
    locks: Array.from({ length: 230 }, (_, n) => ({
      id: n ? `lock-${n}` : "wanted-lock",
      name: `Lock ${String(n).padStart(3, "0")}`,
      version: "A long version description",
      status: "Wishlist",
      belt: "Blue",
      picked: false,
      mechanisms: [],
    })),
  };
  let profileLoading = false;
  const render = () => {
    cursor = 0;
    const tree = Table({ activeProfile, loading: profileLoading });
    const jobs = pending;
    pending = [];
    jobs.forEach((job) => job());
    return tree;
  };
  const nodes = (node) => {
    if (!node || typeof node !== "object") return [];
    return [node, ...React.Children.toArray(node.props?.children).flatMap(nodes)];
  };
  const text = (node) =>
    typeof node === "string" || typeof node === "number"
      ? String(node)
      : React.Children.toArray(node?.props?.children).map(text).join("");
  let tree = render();
  render();
  assert.equal(env.calls + env.directoryCalls, 0);
  let html = renderToStaticMarkup(tree);
  assert.equal((html.match(/class="wishlist-mobile-card"/g) ?? []).length, 0);
  assert(
    !html.includes("wishlist-unmatched-message"),
    "Unloaded locks must not be classified as unmatched",
  );
  const button = (label) =>
    nodes(tree).find((node) => node.type === "button" && text(node) === label);
  async function finishScan() {
    const deadline = Date.now() + 5000;
    do {
      await wait(10);
      tree = render();
      if (!button("Stop loading")) return;
    } while (Date.now() < deadline);
    throw new Error("Owner scan did not finish within the test deadline");
  }
  assert(button("Export Excel").props.disabled);
  assert(!html.includes("wishlist-owner-warning"), "Routine instructions are not warnings");
  assert(html.includes("Not checked yet"), "Unloaded results must not imply zero owners");
  button("Load top 50 — cache first").props.onClick();
  render();
  tree = render();
  assert(button("Stop loading"), "Loading can be stopped from the scan toolbar");
  assert(button("Loading profiles…").props.disabled);
  await finishScan();
  tree = render();
  assert.equal(env.calls, 50);
  assert.equal(env.directoryCalls, 1);
  html = renderToStaticMarkup(tree);
  assert(html.includes("Owner 049"), "All fifty matched owner names must be rendered");
  const unmatchedMessage = nodes(tree).find(
    (node) => node.props?.className === "wishlist-unmatched-message",
  );
  const unmatchedHtml = renderToStaticMarkup(unmatchedMessage);
  assert(unmatchedHtml.includes("165 wishlist locks have no matched owners"));
  assert(unmatchedHtml.includes("Lock 229") && !unmatchedHtml.includes("Lock 000"));
  assert(
    html.indexOf("wishlist-unmatched-message") < html.indexOf("wishlist-owner-table"),
    "Unmatched locks are listed above the table",
  );
  for (const node of nodes(tree).filter(
    (node) => node.props?.className === "wishlist-mobile-card" || node.type === "tbody",
  )) {
    assert(
      !renderToStaticMarkup(node).includes("Lock 229"),
      "Unmatched locks never appear in desktop rows or mobile cards",
    );
  }
  assert(!html.includes("Without loaded matches"), "Unmatched-table filter is removed");
  assert(
    html.includes("0 loaded from cache · 50 fetched from LPU Belts"),
    "Fresh results identify their LPU source after completion",
  );
  assert(!/Show \d+ more owners/.test(html), "Owner names must not be collapsed");
  assert(
    html.includes("Wishlist owner scan") && html.includes("Started") && html.includes("Finished"),
  );
  assert(html.includes("Cached results retain their original fetch times"));
  const calls = env.calls;
  button("Load top 50 — cache first").props.onClick();
  tree = render();
  await wait(20);
  tree = render();
  assert.equal(env.calls, calls);
  assert(
    renderToStaticMarkup(tree).includes("50 loaded from cache · 0 fetched from LPU Belts"),
    "Cached results identify their source without new requests",
  );
  const search = nodes(tree).find((node) => node.type === "input" && node.props.type === "search");
  search.props.onChange({ target: { value: "Lock 000" } });
  tree = render();
  html = renderToStaticMarkup(tree);
  assert.equal((html.match(/class="wishlist-mobile-card"/g) ?? []).length, 1);
  assert(html.includes("Excel exports all 230"));
  assert.equal(env.calls, calls);
  await button("Export Excel").props.onClick();
  const workbookFiles = unzipSync(new Uint8Array(await env.exports.at(-1).arrayBuffer()));
  const wishlistXml = strFromU8(workbookFiles["xl/worksheets/sheet1.xml"]);
  const matchesXml = strFromU8(workbookFiles["xl/worksheets/sheet2.xml"]);
  assert(
    wishlistXml.includes("Lock 229") && matchesXml.includes("Owner 049"),
    "Excel keeps every lock and owner despite filters",
  );
  assert.equal(
    (matchesXml.match(/<row r=/g) ?? []).length,
    238,
    "Export groups all owners into one row per lock",
  );
  assert(env.downloads.at(-1).name.endsWith("-wishlist-tracker.xlsx"));
  search.props.onChange({ target: { value: "nothing matches this search" } });
  tree = render();
  html = renderToStaticMarkup(tree);
  assert(html.includes("No locks match this search"));
  button("Show all matched locks").props.onClick();
  tree = render();
  assert.equal(
    (renderToStaticMarkup(tree).match(/class="wishlist-mobile-card"/g) ?? []).length,
    30,
  );
  const sortSelect = nodes(tree).find(
    (node) => node.type === "select" && node.props.value === "lock:asc",
  );
  sortSelect.props.onChange({ target: { value: "owners:desc" } });
  tree = render();
  assert.equal(env.calls, calls, "Filtering and sorting must not start scans");
  search.props.onChange({ target: { value: "" } });
  tree = render();
  button("Show 30 more locks").props.onClick();
  tree = render();
  html = renderToStaticMarkup(tree);
  assert.equal((html.match(/class="wishlist-mobile-card"/g) ?? []).length, 60);
  env.resetBudget();
  button("Fetch latest from LPU Belts").props.onClick();
  tree = render();
  await finishScan();
  tree = render();
  assert.equal(env.calls, calls + 50);
  env.resetBudget();
  button("Fetch latest from LPU Belts").props.onClick();
  render();
  tree = render();
  button("Stop loading").props.onClick();
  tree = render();
  await wait(20);
  tree = render();
  assert(!button("Load top 50 — cache first").props.disabled, "Stop restores the load action");
  const originalFetch = env.fetch;
  env.fetch = async () => new Response("", { status: 503 });
  button("Fetch latest from LPU Belts").props.onClick();
  render();
  await wait(20);
  tree = render();
  assert(button("Retry leaderboard"));
  assert(
    !button("Export Excel").props.disabled,
    "Previously loaded results can still be exported after a refresh error",
  );
  assert(renderToStaticMarkup(tree).includes("Owner 049"));
  env.fetch = originalFetch;
  env.resetBudget();
  const beforeSwitch = env.calls;
  const outsideProfile = activeProfile;
  activeProfile = { ...activeProfile, id: profiles[0].id };
  render();
  tree = render();
  assert.equal(env.calls, beforeSwitch, "Switching profiles remains cache-only");
  button("Load top 50 — cache first").props.onClick();
  render();
  tree = render();
  await finishScan();
  tree = render();
  assert.equal(env.calls, beforeSwitch + 1, "Only the 51st profile needs fetching");
  html = renderToStaticMarkup(tree);
  assert(html.includes("Owner 050"), "The 51st profile replaces the active user");
  assert(!html.includes(">Owner 000<"), "The active user is excluded from owner matches");
  assert(html.includes("49 loaded from cache · 1 fetched from LPU Belts"));
  const beforeReturn = env.calls;
  activeProfile = outsideProfile;
  render();
  tree = render();
  html = renderToStaticMarkup(tree);
  assert.equal(env.calls, beforeReturn, "Returning to an outside profile uses the cache");
  assert(
    html.includes("Owner 000") && !html.includes("Owner 050"),
    "Outside profiles use ranks 1–50",
  );
  assert(html.includes("50 loaded from cache · 0 fetched from LPU Belts"));
  const fullWishlist = activeProfile;
  activeProfile = { ...activeProfile, locks: activeProfile.locks.slice(100, 102) };
  render();
  tree = render();
  html = renderToStaticMarkup(tree);
  assert(
    html.includes("2 wishlist locks have no matched owners") &&
      html.includes("No matched owners yet"),
  );
  assert(
    !html.includes("wishlist-mobile-card") && !html.includes('class="wishlist-owner-table"'),
    "All-unmatched wishlists have no results table",
  );
  activeProfile = { ...fullWishlist, locks: fullWishlist.locks.slice(0, 2) };
  render();
  tree = render();
  assert(
    !renderToStaticMarkup(tree).includes("wishlist-unmatched-message"),
    "All-matched wishlists have no unmatched message",
  );
  activeProfile = fullWishlist;
  render();
  tree = render();
  profileLoading = true;
  tree = render();
  html = renderToStaticMarkup(tree);
  assert(html.includes("Loading your wishlist…"));
  assert(
    !html.includes("wishlist-mobile-card"),
    "Previous profile results are hidden while loading",
  );
  profileLoading = false;
  activeProfile = { ...activeProfile, locks: [] };
  tree = render();
  html = renderToStaticMarkup(tree);
  assert(html.includes("No wishlist locks yet"));
  assert(button("Load top 50 — cache first").props.disabled);
  console.log(
    "PASS: page opening makes no requests; manual cache-first/fetch-latest actions; 30-card pagination; clear/search/sort controls; unmatched message outside desktop/mobile results; formatted Excel export; stop/retry; cached export after refresh failure; loading/empty states.",
  );
}
(async () => {
  const time = environment().load("app/activity-status.tsx");
  assert.match(time.formatActivityTime("2026-10-16T09:23:10Z"), /5:23:10 AM EDT/);
  assert.match(time.formatActivityTime("2026-01-16T09:23:10Z"), /4:23:10 AM EST/);
  assert.match(time.formatActivityTime("2026-10-16"), /Oct 16, 2026 \(time not supplied\)/);
  assert.equal(time.formatActivityTime("Not supplied"), "Not supplied");
  const stamp = renderToStaticMarkup(
    React.createElement(time.DataTimestamp, { value: "2026-10-16T09:23:10Z" }),
  );
  assert(stamp.includes('dateTime="2026-10-16T09:23:10.000Z"'));
  console.log(
    "PASS: full timestamps, New York daylight-saving conversion, date-only sources do not invent times.",
  );
  await queueChecks();
  await componentChecks();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
