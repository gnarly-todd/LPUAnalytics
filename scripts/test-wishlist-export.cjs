// Network-free checks for the production Excel export. Optional argument saves a QA fixture.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { unzipSync, strFromU8 } = require("fflate");
const root = path.resolve(__dirname, "..");
const cache = new Map();
function load(name) {
  const file = path.resolve(root, name);
  if (file.endsWith(".json")) return JSON.parse(fs.readFileSync(file, "utf8"));
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const localRequire = (id) =>
    id.startsWith(".")
      ? load(
          path.relative(
            root,
            path.resolve(path.dirname(file), id.endsWith(".json") ? id : `${id}.ts`),
          ),
        )
      : require(id);
  vm.runInNewContext(
    code,
    { module, exports: module.exports, require: localRequire, Uint8Array },
    { filename: file },
  );
  return module.exports;
}
const { wishlistOwnersWorkbook, wishlistExportBeltOrder } = load("app/wishlist-owner-export.ts");
const labels = [
  "Unranked",
  "White",
  "Yellow",
  "Orange",
  "Green",
  "Blue",
  "Purple",
  "Brown",
  "Red",
  "Black",
  "Black 1",
  "Black 2",
  "Black 3",
  "Black 4",
  "Black 5",
];
const locks = labels.map((label, i) => ({
  id: `lock-${i}`,
  name: `${label} example lock`,
  version: i % 2 ? "Longer variant description" : "",
  belt: label.startsWith("Black") ? "Black" : label,
  ...(label.startsWith("Black ") ? { beltLevel: label } : {}),
  mechanisms: [],
  status: "Wishlist",
  picked: false,
}));
const active = {
  id: "qa-active-profile",
  name: "QA profile & collection",
  url: "https://lpubelts.com",
  refreshedAt: "2026-10-17T02:39:00Z",
  locks: locks.slice().reverse(),
};
const owners = [
  {
    id: "qa-owner-1",
    name: "Smith, Alex",
    url: "https://lpubelts.com/#/profile/qa-owner-1",
    refreshedAt: "2026-10-17T02:38:00Z",
    locks: locks.slice(0, 12).map((lock) => ({ ...lock, status: "Owned" })),
  },
  {
    id: "qa-owner-2",
    name: "Second collector",
    url: "https://lpubelts.com/#/profile/qa-owner-2",
    refreshedAt: "2026-10-17T02:38:01Z",
    locks: locks.slice(0, 6).map((lock) => ({ ...lock, status: "Owned" })),
  },
];
const options = {
  totalProfiles: 50,
  failedNames: ["Unavailable profile"],
  searchScope: "Top 50 other named public profiles",
  leaderboardUpdatedAt: "2026-10-16T14:57:00Z",
  demand: { counts: { "lock-0": 12, "lock-1": 6 }, updatedAt: "2026-10-16T03:57:09Z" },
};
const bytes = wishlistOwnersWorkbook(active, owners, options);
const files = unzipSync(bytes);
const xml = (name) => strFromU8(files[name]);
const main = xml("xl/worksheets/sheet1.xml");
const detail = xml("xl/worksheets/sheet2.xml");
assert(main.indexOf("White example") < main.indexOf("Blue example"));
assert(main.indexOf("Black 1 example") < main.indexOf("Black 5 example"));
assert(wishlistExportBeltOrder(locks.at(-1)) > wishlistExportBeltOrder(locks.at(-5)));
assert(main.includes("QA profile &amp; collection"));
assert(detail.includes("Smith, Alex") && detail.includes("Second collector"));
assert(
  detail.includes('r="G9"') && /r="G9"[^>]*><v>2<\/v>/.test(detail),
  "Owner names containing commas do not inflate the count",
);
assert.equal(
  (detail.match(/<row r=/g) ?? []).length,
  23,
  "One row per wishlist lock, including unmatched locks",
);
assert(detail.includes("No matches among loaded profiles"));
assert(
  main.includes(
    "INDEX(&apos;Owner matches&apos;!$G$9:$G$23,MATCH(H9,&apos;Owner matches&apos;!$F$9:$F$23,0))",
  ),
);
assert(
  main.includes('xSplit="1" ySplit="8"') &&
    main.includes("Wanted,Contacted,Pending,Acquired,On hold"),
);
assert(xml("xl/tables/table1.xml").includes('ref="A8:I23"'));
assert(xml("xl/tables/table2.xml").includes('ref="A8:U23"'));
assert(xml("xl/tables/table2.xml").includes('<autoFilter ref="A8:U23"/>'));
const malicious = {
  ...active,
  name: "=1+1",
  locks: [{ ...locks[0], name: '=HYPERLINK("https://example.com")' }],
};
const safeXml = strFromU8(
  unzipSync(wishlistOwnersWorkbook(malicious, [], options))["xl/worksheets/sheet1.xml"],
);
assert(safeXml.includes('t="inlineStr"><is><t xml:space="preserve">=HYPERLINK'));
assert(!safeXml.includes("<f>HYPERLINK"));
const emptyFiles = unzipSync(wishlistOwnersWorkbook({ ...active, locks: [] }, [], options));
assert(strFromU8(emptyFiles["xl/tables/table1.xml"]).includes('ref="A8:I9"'));
const longFiles = unzipSync(wishlistOwnersWorkbook(
  { ...active, locks: [{ ...locks[0], name: "x".repeat(32768) }] }, [], options,
));
assert(strFromU8(longFiles["xl/workbook.xml"]).includes('name="Overflow details"'));
const continuation = strFromU8(longFiles["xl/worksheets/sheet3.xml"]);
const parts = [...continuation.matchAll(/<c r="D(\d+)"[^>]*><is><t xml:space="preserve">(.*?)<\/t><\/is><\/c>/gs)]
  .filter(match => Number(match[1]) >= 9).map(match => match[2]);
assert(parts.every(part => part.length <= 30000));
assert.equal(parts.join("").length, 32768, "Complete shared long name is retained");
assert(parts.every(part => /^x+$/.test(part)));
assert(strFromU8(longFiles["xl/worksheets/sheet1.xml"]).includes("See Overflow details"));
if (process.argv[2]) fs.writeFileSync(path.resolve(process.argv[2]), bytes);
console.log(
  "PASS: two native Excel sheets, one row per lock, all owners and unmatched locks, belt order, canonical counts, linked formulas, statuses, table filters, frozen panes, partial coverage, empty export, XML escaping and literal user text.",
);
