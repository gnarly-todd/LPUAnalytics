// Synthetic benchmark; timings describe this machine and are not device guarantees.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { performance } = require("node:perf_hooks");
const file = path.join(__dirname, "../app/wishlist-owner-utils.ts");
const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const mod = { exports: {} };
vm.runInNewContext(code, {
  module: mod,
  exports: mod.exports,
  require: () => ({
    beltOrder: [
      "White",
      "Yellow",
      "Orange",
      "Green",
      "Blue",
      "Purple",
      "Brown",
      "Red",
      "Black",
      "Unranked",
    ],
  }),
});
const lock = (id, status) => ({
  id: `lock-${id}`,
  name: `Lock ${id}`,
  status,
  belt: "Blue",
  mechanisms: [],
  picked: false,
});
const active = {
  id: "active",
  name: "Active",
  url: "",
  refreshedAt: "",
  locks: Array.from({ length: 300 }, (_, i) => lock(i, "Wishlist")),
};
const owners = Array.from({ length: 1500 }, (_, i) => ({
  id: `owner-${i}`,
  name: `Owner ${i}`,
  url: "",
  refreshedAt: "",
  locks: Array.from({ length: 180 }, (_, j) => lock((i * 71 + j * 13) % 6000, "Owned")),
}));
const match = mod.exports.matchWishlistOwners;
for (let i = 0; i < 3; i++) match(active, owners);
const times = [];
let output;
for (let i = 0; i < 9; i++) {
  const start = performance.now();
  output = match(active, owners);
  times.push(performance.now() - start);
}
times.sort((a, b) => a - b);
console.log(
  JSON.stringify({
    profiles: owners.length,
    locksPerProfile: 180,
    wishlist: 300,
    iterations: times.length,
    medianMs: +times[4].toFixed(2),
    minMs: +times[0].toFixed(2),
    maxMs: +times.at(-1).toFixed(2),
    rows: output.length,
    totalMatches: output.reduce((sum, row) => sum + row.owners.length, 0),
  }),
);
