const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
function environment(fetcher, window) {
  const modules = new Map();
  function load(file) {
    file = path.resolve(root, file);
    if (modules.has(file)) return modules.get(file).exports;
    const module = { exports: {} };
    modules.set(file, module);
    const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText;
    const requireLocal = (id) =>
      id.startsWith(".") ? load(path.resolve(path.dirname(file), `${id}.ts`)) : require(id);
    vm.runInNewContext(
      code,
      {
        module,
        exports: module.exports,
        require: requireLocal,
        fetch: fetcher,
        ...(window ? { window } : {}),
        Response,
        Request,
        Headers,
        URL,
        URLSearchParams,
        AbortSignal,
        setTimeout,
        console,
      },
      { filename: file },
    );
    return module.exports;
  }
  return load;
}
const id = "valid-public-profile-id-000";
const catalog = [
  { id: "owned", belt: "Black 5", makeModels: [{ make: "Test", model: "Lock" }] },
  { id: "wish", belt: "Blue", makeModels: [{ make: "Wishlist", model: "Lock" }] },
];
const url = `https://test.chatgpt.site/api/lpu-profile?url=${encodeURIComponent(`https://lpubelts.com/#/profile/${id}`)}`;
(async () => {
  const calls = [];
  const load = environment(async (url) => {
    calls.push(url);
    if (url.startsWith("https://api.lpubelts.com/api/v1/users/"))
      return Response.json({
        data: {
          userId: id,
          displayName: "Test profile",
          collections: { own: ["owned"], wishlist: ["wish"], picked: ["owned"] },
        },
      });
    assert(url.includes("/main/apps/web/src/data/data.json"));
    return Response.json(catalog);
  });
  const profileRoute = load("app/api/lpu-profile/route.ts");
  const response = await profileRoute.GET(new Request(url));
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.profile.locks.length, 2);
  assert(result.profile.locks.find((lock) => lock.id === "owned").picked);
  assert.equal(result.profile.locks.find((lock) => lock.id === "owned").beltLevel, "Black 5");
  const repeated = await profileRoute.GET(new Request(url));
  assert.equal(repeated.status, 200);
  assert.equal(calls.length, 2, "Successful profile/catalog requests are coalesced and cached");
  assert.equal(
    (await profileRoute.GET(new Request(url, { headers: { Origin: "https://untrusted.example" } })))
      .status,
    403,
  );
  const proxy = load("app/api/lpu-user/route.ts");
  assert.equal(
    (await proxy.GET(new Request("https://test.chatgpt.site/api/lpu-user?userId=invalid"))).status,
    400,
  );
  assert.equal(
    (await proxy.GET(new Request(`https://test.chatgpt.site/api/lpu-user?userId=${id}`))).status,
    200,
  );
  const browserCalls = [];
  const storage = new Map();
  const browser = environment(
    async (url) => {
      browserCalls.push(url);
      return Response.json({ data: {} });
    },
    {
      location: { hostname: "test.chatgpt.site" },
      localStorage: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
      },
    },
  );
  await browser("app/lpu-request.ts").fetchLpuUser(id);
  assert.deepEqual(
    browserCalls,
    [`/api/lpu-user?userId=${id}`],
    "Hosted browser requests stay on the same origin",
  );
  const limited = environment(
    async () => new Response("", { status: 429, headers: { "Retry-After": "60" } }),
  );
  const paused = await limited("app/api/lpu-user/route.ts").GET(
    new Request(`https://test.chatgpt.site/api/lpu-user?userId=${id}`),
  );
  assert.equal(paused.status, 429);
  assert(Number(paused.headers.get("retry-after")) > 0);
  const failed = environment(async () => {
    throw new TypeError("Failed to fetch");
  });
  await assert.rejects(failed("app/lpu-request.ts").fetchLpuUser(id), /saved data has been kept/);
  console.log(
    "PASS: new API/catalog URLs, hosted profile loading, repeat loads, origin validation, same-origin owner transport, invalid IDs, retained cooldown and readable network failures.",
  );
  if (process.argv.includes("--live")) {
    const live = environment(fetch)("app/api/lpu-profile/route.ts");
    for (const profileId of ["84dULJFIN4bHIC1LxCiuvBCSqT43", "pzSak8xusHdeNlD0JmTru5kMrww2"]) {
      const res = await live.GET(
        new Request(
          `https://test.chatgpt.site/api/lpu-profile?url=${encodeURIComponent(`https://lpubelts.com/#/profile/${profileId}`)}`,
        ),
      );
      const body = await res.json();
      assert.equal(res.status, 200, JSON.stringify(body));
      console.log(
        JSON.stringify({
          name: body.profile.name,
          owned: body.profile.locks.filter((lock) => lock.status === "Owned").length,
          wishlist: body.profile.locks.filter((lock) => lock.status === "Wishlist").length,
          picked: body.profile.locks.filter((lock) => lock.picked).length,
        }),
      );
    }
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
