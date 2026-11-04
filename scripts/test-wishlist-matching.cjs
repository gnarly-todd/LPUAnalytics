const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../app/wishlist-owner-utils.ts"), "utf8");
const code = ts.transpileModule(source, {
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
const { matchWishlistOwners, rankWishlistOwnerMatches } = mod.exports;
const lock = (id, status) => ({
  id,
  name: id,
  status,
  belt: "Blue",
  picked: false,
  mechanisms: [],
});
const profile = (id, name, locks) => ({
  id,
  name,
  locks,
  url: `/${id}`,
  refreshedAt: "2026-10-01",
});
const active = profile("self", "Self", [
  lock("B", "Wishlist"),
  lock("A", "Wishlist"),
  lock("A", "Wishlist"),
  lock("C", "Owned"),
]);
const candidates = [
  profile("self", "Self", [lock("A", "Owned")]),
  profile("one", "Old name", [lock("B", "Owned")]),
  profile("two", "Zoe", [lock("B", "Owned"), lock("A", "Owned"), lock("A", "Owned")]),
  profile("one", "Amy", [lock("A", "Owned"), lock("B", "Wishlist")]),
  profile("anonymous", "Anonymous", [lock("A", "Owned")]),
];
const rows = matchWishlistOwners(active, candidates);
assert.equal(
  JSON.stringify(rows.map(({ lock, owners }) => [lock.id, owners.map((owner) => owner.name)])),
  JSON.stringify([
    ["A", ["Amy", "Zoe"]],
    ["A", ["Amy", "Zoe"]],
    ["B", ["Zoe"]],
  ]),
);
const ranked = rankWishlistOwnerMatches(rows);
assert.equal(
  JSON.stringify(ranked.map(({ profile, locks }) => [profile.name, locks.map((item) => item.id)])),
  JSON.stringify([
    ["Zoe", ["A", "B"]],
    ["Amy", ["A"]],
  ]),
);
assert.equal(matchWishlistOwners(profile("empty", "Empty", []), candidates).length, 0);

// Compare against the original set-intersection semantics on a larger mixed fixture.
const reference = (selected, all) => {
  const unique = [
    ...new Map(
      all
        .filter(
          (p) =>
            p.id !== selected.id &&
            p.name.trim() &&
            !/^(no display name|anonymous|unnamed|undefined|null)$/i.test(p.name.trim()),
        )
        .map((p) => [p.id, p]),
    ).values(),
  ];
  const owned = new Map(
    unique.map((p) => [
      p.id,
      new Set(p.locks.filter((item) => item.status === "Owned").map((item) => item.id)),
    ]),
  );
  return selected.locks
    .filter((item) => item.status === "Wishlist")
    .map((item) => ({
      lock: item,
      owners: unique
        .filter((p) => owned.get(p.id).has(item.id))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.lock.name.localeCompare(b.lock.name));
};
const largeActive = profile(
  "self",
  "Self",
  Array.from({ length: 80 }, (_, n) => lock(`lock-${n}`, "Wishlist")),
);
const largeCandidates = Array.from({ length: 240 }, (_, n) =>
  profile(
    `p-${n}`,
    `Owner ${n % 29}`,
    Array.from({ length: 70 }, (_, i) =>
      lock(`lock-${(n * 17 + i * 11) % 200}`, i % 9 ? "Owned" : "Wishlist"),
    ),
  ),
);
const compact = (result) =>
  JSON.stringify(result.map(({ lock, owners }) => [lock.id, owners.map((owner) => owner.id)]));
assert.equal(
  compact(matchWishlistOwners(largeActive, largeCandidates)),
  compact(reference(largeActive, largeCandidates)),
);
console.log(
  "PASS: indexed wishlist matching preserves results, exclusions, owner ordering, duplicate handling, and ranked overlap counts.",
);
