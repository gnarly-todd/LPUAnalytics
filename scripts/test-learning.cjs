const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const moduleState = { exports: {} };
vm.runInNewContext(
  ts.transpileModule(fs.readFileSync(path.join(root, "app/insights-model.ts"), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  { module: moduleState, exports: moduleState.exports, Intl },
);
const { learningWishlist } = moduleState.exports;
const lock = (id, status, mechanisms) => ({
  id,
  name: id,
  belt: "Blue",
  picked: false,
  status,
  mechanisms,
});
const profile = {
  id: "a",
  locks: [
    lock("owned", "Owned", ["Dimple"]),
    lock("feature", "Wishlist", ["Dimple"]),
    lock("mechanism", "Wishlist", ["Disc detainer"]),
    lock("unknown", "Wishlist", ["Lever"]),
  ],
};
const catalog = [
  { id: "owned", features: ["False gates"] },
  { id: "feature", features: ["FALSE GATES", "Sidepins"] },
  { id: "mechanism", features: [] },
];
const rows = learningWishlist(profile, { catalog });
assert.equal(rows.length, 2, "Unknown catalog IDs are excluded");
assert.equal(rows[0].lock.id, "mechanism", "New mechanisms sort before new feature counts");
assert.deepEqual(
  Array.from(rows[1].newFeatures),
  ["Sidepins"],
  "Feature novelty ignores letter case",
);
assert.equal(learningWishlist({ locks: [] }, { catalog }).length, 0);
assert.equal(
  learningWishlist({ locks: [lock("owned", "Owned", ["Dimple"])] }, { catalog }).length,
  0,
);
assert.equal(
  learningWishlist(profile, { catalog: catalog.map(({ id }) => ({ id })) })[1].newFeatures.length,
  0,
  "Older snapshots without features remain usable",
);
(async () => {
  const { normalizeInsightSources } = await import("../app/insight-sources.mjs");
  const stat = { listStats: { own: {}, picked: {}, wishlist: {} }, wishlistSavesById: {} };
  const data = normalizeInsightSources({
    catalog: [
      {
        id: "test",
        makeModels: [{ make: "Test" }],
        features: ["False gates", "Flickr Update", "Latest Changelog", "Picking Risk"],
        scorecardCount: 0,
      },
    ],
    stats: { allUsers: stat, blackBeltOnly: stat },
    votes: [],
    picks: { byLock: {} },
    discord: {},
    reddit: {},
    safes: [],
  });
  assert.deepEqual(data.catalog[0].features, ["False gates"]);
  assert.deepEqual(data.catalog[0].flags, ["Picking Risk"]);
  assert.equal(data.catalog[0].scorecardCount, 0, "Zero and missing counts are distinct");
  console.log(
    "PASS: wishlist novelty, mechanism-first ranking, case-insensitive matching, missing catalog/features, editorial tags excluded and source flags preserved.",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
