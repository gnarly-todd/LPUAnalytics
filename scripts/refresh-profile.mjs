import { readFile, writeFile } from "node:fs/promises";

const PROFILE_ID = "84dULJFIN4bHIC1LxCiuvBCSqT43";
const LPU_USER_API = "https://api.lpubelts.com/api/v1/users";
const LPU_DATA =
  "https://raw.githubusercontent.com/Lockpickers-United/lpu-belt-explorer/main/apps/web/src/data/data.json";
const DATA_FILE = new URL("../app/data.ts", import.meta.url);

async function getText(url) {
  const response = await fetch(url, {
    headers: { "user-agent": "todd-lock-analytics-refresh/1.0" },
  });
  if (!response.ok) throw new Error(`Request failed (${response.status}): ${url}`);
  return response.text();
}

async function getJson(url) {
  return JSON.parse(await getText(url));
}

function collectionStrings(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}

function lockName(entry) {
  return entry.makeModels
    .map(({ make, model }) => [make, model].filter(Boolean).join(" ").trim())
    .filter(Boolean)
    .join(" / ");
}

function normalizedBelt(belt) {
  return /^Black [1-5]$/.test(belt) ? "Black" : belt;
}

function resourceLinks(entry) {
  return {
    lpu: `https://lpubelts.com/locks/${entry.id}.html`,
  };
}

const profileUrl = `${LPU_USER_API}/${encodeURIComponent(PROFILE_ID)}`;
const [profile, allEntries] = await Promise.all([getJson(profileUrl), getJson(LPU_DATA)]);

if (profile.data?.userId !== PROFILE_ID) {
  throw new Error("LPU profile response did not match the configured user.");
}
const collections = profile.data.collections;
if (!Array.isArray(collections?.picked)) {
  throw new Error("LPU profile response is missing collections.picked.");
}
const ownedIds = collectionStrings(collections.own);
const wishlistIds = collectionStrings(collections.wishlist);
const ownedSet = new Set(ownedIds);
const pickedIds = collectionStrings(collections.picked).filter((id) => ownedSet.has(id));
const selectedIds = new Set([...ownedIds, ...wishlistIds]);
const selectedEntries = allEntries.filter((entry) => selectedIds.has(entry.id));

if (ownedIds.length + wishlistIds.length !== selectedIds.size) {
  throw new Error("Owned and wishlist profile data overlap; refusing to publish ambiguous data.");
}
if (selectedEntries.length !== selectedIds.size) {
  throw new Error(
    `LPU catalog mismatch: found ${selectedEntries.length} of ${selectedIds.size} selected locks.`,
  );
}
if (pickedIds.some((id) => !ownedIds.includes(id))) {
  throw new Error("A picked lock is not marked owned; refusing to publish inconsistent data.");
}

const catalog = selectedEntries.map((entry) => {
  const belt = normalizedBelt(entry.belt);

  return {
    id: entry.id,
    name: lockName(entry),
    ...(entry.version ? { version: entry.version } : {}),
    mechanisms: entry.lockingMechanisms ?? [],
    belt,
    ...(belt !== entry.belt ? { beltLevel: entry.belt } : {}),
    resourceLinks: resourceLinks(entry),
  };
});

let source = await readFile(DATA_FILE, "utf8");
const start = source.indexOf("const lockCatalog:");
const end = source.indexOf("export const ownedLocks");
if (start < 0 || end < 0 || end <= start) {
  throw new Error("Could not find the generated profile-data section in app/data.ts.");
}

const generated = `const lockCatalog: Omit<LockRecord, "status" | "picked">[] = ${JSON.stringify(catalog, null, 2)};

const ownedLockIds = new Set(${JSON.stringify(ownedIds, null, 2)});
const pickedLockIds = new Set(${JSON.stringify(pickedIds, null, 2)});

export const locks: LockRecord[] = lockCatalog.map((lock) => ({
  ...lock,
  status: ownedLockIds.has(lock.id) ? "Owned" : "Wishlist",
  picked: pickedLockIds.has(lock.id),
}));

`;

const refreshedDate = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "America/New_York",
}).format(new Date());
const refreshedTime = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
  timeZone: "America/New_York",
}).format(new Date());
const refreshedOn = `${refreshedDate} · ${refreshedTime}`;

source = source.slice(0, start) + generated + source.slice(end);
source = source.replace(
  /export const profileSnapshotDate = "[^"]+";/,
  `export const profileSnapshotDate = "${refreshedOn}";`,
);
const extraCollections = Object.fromEntries(
  [
    "own",
    "picked",
    "wishlist",
    "recorded",
    "recordedLocks",
    "scorecard",
    "safelocksOwn",
    "safelocksCracked",
    "safelocksWishlist",
  ]
    .filter((key) => Array.isArray(collections[key]))
    .map((key) => [key, [...new Set(collectionStrings(collections[key]))]]),
);
const extraSnapshot = `export const profileCollectionsSnapshot: Record<string, string[]> = ${JSON.stringify(extraCollections)};`;
if (/export const profileCollectionsSnapshot: Record<string, string\[\]> = [^;]*;/.test(source)) {
  source = source.replace(
    /export const profileCollectionsSnapshot: Record<string, string\[\]> = [^;]*;/,
    extraSnapshot,
  );
} else {
  source = source.replace(
    /(export const profileSnapshotDate = "[^"]+";)/,
    `$1\n\n${extraSnapshot}`,
  );
}
await writeFile(DATA_FILE, source);

console.log(
  `Refreshed ${selectedEntries.length} locks: ${ownedIds.length} owned, ` +
    `${wishlistIds.length} wishlist, ${pickedIds.length} picked.`,
);
