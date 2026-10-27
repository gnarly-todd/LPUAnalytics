import type { LockRecord } from "./data";

export function formatInsightDate(value?: string) {
  if (!value || !Number.isFinite(Date.parse(value))) return "Not supplied";
  // Preserve calendar-only dates and use the same timezone during server and
  // browser rendering so midnight UTC does not cause a hydration mismatch.
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(date);
}

export const INSIGHT_BELTS = [
  "White",
  "Yellow",
  "Orange",
  "Green",
  "Blue",
  "Purple",
  "Brown",
  "Red",
  "Black",
];
export type ProfileCollections = Partial<
  Record<
    | "own"
    | "picked"
    | "wishlist"
    | "recorded"
    | "recordedLocks"
    | "scorecard"
    | "safelocksOwn"
    | "safelocksCracked"
    | "safelocksWishlist",
    string[]
  >
>;
export type InsightProfile = {
  id: string;
  name: string;
  locks: LockRecord[];
  collections?: ProfileCollections;
  refreshedAt: string;
};
export type CatalogInsight = {
  id: string;
  name: string;
  version?: string;
  belt: string;
  makes: string[];
  mechanisms: string[];
  addedAt?: string;
  updatedAt?: string;
  rankDate?: string;
  documentedPicks: number;
  popularity: number;
  features?: string[];
  flags?: string[];
  scorecardCount?: number;
};
export type CohortStat = { users: number; average: number; maximum: number };
export type InsightsData = {
  schemaVersion: 1;
  fetchedAt: string;
  statsUpdatedAt: string;
  totalProfiles: number;
  cohorts: { all: Record<string, CohortStat>; black: Record<string, CohortStat> };
  demand: Record<string, number>;
  catalog: CatalogInsight[];
  votes: Record<string, Record<string, number>>;
  voteCount: number;
  safeCatalog: { id: string; name: string; tier: string }[];
  memberBelts: { platform: string; counts: number[] }[];
  sources: Record<string, string>;
};

export function profileCollections(value: unknown): ProfileCollections {
  if (!value || typeof value !== "object") return {};
  const source = value as Record<string, unknown>;
  const result: ProfileCollections = {};
  for (const key of [
    "own",
    "picked",
    "wishlist",
    "recorded",
    "recordedLocks",
    "scorecard",
    "safelocksOwn",
    "safelocksCracked",
    "safelocksWishlist",
  ] as const) {
    if (
      Array.isArray(source[key]) &&
      source[key].every((item: unknown) => typeof item === "string")
    )
      result[key] = [...new Set(source[key] as string[])];
  }
  return result;
}

export function profileMetric(profile: InsightProfile, key: string): number | null {
  const collections = profile.collections;
  if (key === "own")
    return (
      collections?.own?.length ?? profile.locks.filter((lock) => lock.status === "Owned").length
    );
  if (key === "wishlist")
    return (
      collections?.wishlist?.length ??
      profile.locks.filter((lock) => lock.status === "Wishlist").length
    );
  if (key === "picked")
    return collections?.picked?.length ?? profile.locks.filter((lock) => lock.picked).length;
  if (key === "recordedLocks") {
    if (!collections?.scorecard && !collections?.recordedLocks) return null;
    return new Set([...(collections.scorecard ?? []), ...(collections.recordedLocks ?? [])]).size;
  }
  return collections?.[key as keyof ProfileCollections]?.length ?? null;
}

export function lockRank(belt: string) {
  const base = belt.replace(/ [1-5]$/, "");
  const index = INSIGHT_BELTS.indexOf(base);
  return index < 0
    ? -1
    : index + (base === "Black" ? Number(belt.match(/[1-5]$/)?.[0] ?? 0) / 10 : 0);
}

export function voteSummary(entry: CatalogInsight, data: InsightsData) {
  const counts = data.votes[entry.id] ?? {};
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const highest = Math.max(0, ...Object.values(counts));
  const leading = Object.keys(counts)
    .filter((belt) => counts[belt] === highest)
    .sort((a, b) => lockRank(a) - lockRank(b));
  const agreement = total ? (counts[entry.belt] ?? 0) / total : null;
  return { total, counts, leading, agreement, disagreement: total ? 1 - (agreement ?? 0) : 0 };
}

export function catalogCoverage(
  profile: InsightProfile,
  data: InsightsData,
  group: "belt" | "make" | "mechanism",
) {
  const owned = new Set(
    profile.locks.filter((lock) => lock.status === "Owned").map((lock) => lock.id),
  );
  const groups = new Map<
    string,
    { label: string; owned: number; total: number; percent: number }
  >();
  for (const entry of data.catalog) {
    const labels =
      group === "belt"
        ? [entry.belt.replace(/ [1-5]$/, "")]
        : group === "make"
          ? entry.makes
          : entry.mechanisms;
    for (const label of new Set(labels)) {
      const row = groups.get(label) ?? { label, owned: 0, total: 0, percent: 0 };
      row.total++;
      if (owned.has(entry.id)) row.owned++;
      groups.set(label, row);
    }
  }
  return [...groups.values()]
    .map((row) => ({ ...row, percent: row.total ? (row.owned / row.total) * 100 : 0 }))
    .sort((a, b) =>
      group === "belt"
        ? lockRank(a.label) - lockRank(b.label)
        : b.owned - a.owned || a.label.localeCompare(b.label),
    );
}

export function challengeSuggestions(profile: InsightProfile, data: InsightsData) {
  const entries = new Map(data.catalog.map((entry) => [entry.id, entry]));
  const picked = profile.locks.filter((lock) => lock.picked);
  const pickedIds = new Set(profile.collections?.picked ?? picked.map((lock) => lock.id));
  const pickedCatalog = data.catalog.filter((entry) => pickedIds.has(entry.id));
  const practiced = new Set([
    ...picked.flatMap((lock) => lock.mechanisms),
    ...pickedCatalog.flatMap((entry) => entry.mechanisms),
  ]);
  const highest = Math.max(
    -1,
    ...picked.map((lock) => lockRank(lock.beltLevel ?? lock.belt)),
    ...pickedCatalog.map((entry) => lockRank(entry.belt)),
  );
  const target = highest >= 8 ? Math.min(8.5, highest + 0.1) : Math.min(8.1, highest + 1);
  return profile.locks
    .filter(
      (lock) =>
        lock.status === "Owned" &&
        !lock.picked &&
        !pickedIds.has(lock.id) &&
        lock.belt !== "Unranked",
    )
    .map((lock) => {
      const entry = entries.get(lock.id);
      return {
        lock,
        documentedPicks: entry?.documentedPicks ?? 0,
        newMechanism: lock.mechanisms.some((mechanism) => !practiced.has(mechanism)),
        distance: Math.abs(lockRank(lock.beltLevel ?? lock.belt) - target),
      };
    })
    .sort(
      (a, b) =>
        a.distance - b.distance ||
        Number(b.newMechanism) - Number(a.newMechanism) ||
        b.documentedPicks - a.documentedPicks ||
        a.lock.name.localeCompare(b.lock.name),
    );
}

export function validInsightsData(value: unknown): value is InsightsData {
  const data = value as InsightsData | null;
  const counts = (map: unknown) =>
    !!map &&
    typeof map === "object" &&
    !Array.isArray(map) &&
    Object.values(map).every(
      (count) => typeof count === "number" && Number.isFinite(count) && count >= 0,
    );
  const cohort = (group: unknown) =>
    !!group &&
    typeof group === "object" &&
    Object.values(group).every(
      (stat) =>
        !!stat &&
        typeof stat === "object" &&
        ["users", "average", "maximum"].every(
          (key) =>
            typeof (stat as Record<string, unknown>)[key] === "number" &&
            Number.isFinite((stat as Record<string, number>)[key]) &&
            (stat as Record<string, number>)[key] >= 0,
        ),
    );
  return (
    !!data &&
    data.schemaVersion === 1 &&
    Number.isFinite(Date.parse(data.fetchedAt)) &&
    typeof data.statsUpdatedAt === "string" &&
    Number.isFinite(data.totalProfiles) &&
    Array.isArray(data.catalog) &&
    data.catalog.length > 0 &&
    data.catalog.every(
      (entry) =>
        typeof entry.id === "string" &&
        typeof entry.name === "string" &&
        typeof entry.belt === "string" &&
        Array.isArray(entry.makes) &&
        entry.makes.every((name) => typeof name === "string") &&
        Array.isArray(entry.mechanisms) &&
        entry.mechanisms.every((name) => typeof name === "string") &&
        Number.isFinite(entry.documentedPicks) &&
        [entry.features, entry.flags].every(
          (list) =>
            list === undefined ||
            (Array.isArray(list) && list.every((tag) => typeof tag === "string")),
        ) &&
        (entry.scorecardCount === undefined ||
          (Number.isFinite(entry.scorecardCount) && entry.scorecardCount >= 0)),
    ) &&
    !!data.cohorts?.all?.own &&
    !!data.cohorts?.all?.picked &&
    !!data.cohorts?.all?.wishlist &&
    !!data.cohorts?.black?.own &&
    cohort(data.cohorts.all) &&
    cohort(data.cohorts.black) &&
    counts(data.demand) &&
    !!data.votes &&
    typeof data.votes === "object" &&
    Object.values(data.votes).every(counts) &&
    Array.isArray(data.safeCatalog) &&
    data.safeCatalog.every(
      (entry) =>
        typeof entry.id === "string" &&
        typeof entry.name === "string" &&
        typeof entry.tier === "string",
    ) &&
    Array.isArray(data.memberBelts) &&
    data.memberBelts.every(
      (group) =>
        typeof group.platform === "string" &&
        Array.isArray(group.counts) &&
        group.counts.length === INSIGHT_BELTS.length &&
        group.counts.every((count) => Number.isFinite(count) && count >= 0),
    ) &&
    !!data.sources &&
    Object.values(data.sources).every(
      (url) => typeof url === "string" && url.startsWith("https://"),
    )
  );
}

// Novelty compares the wishlist with Owned, never the selected screen or another profile.
export function learningWishlist(profile: InsightProfile, data: InsightsData) {
  const catalog = new Map(data.catalog.map((entry) => [entry.id, entry]));
  const owned = profile.locks.filter((lock) => lock.status === "Owned");
  const mechanisms = new Set(
    owned.flatMap((lock) => lock.mechanisms.map((name) => name.toLocaleLowerCase("en-US"))),
  );
  const features = new Set(
    owned.flatMap((lock) =>
      (catalog.get(lock.id)?.features ?? []).map((name) => name.toLocaleLowerCase("en-US")),
    ),
  );
  return profile.locks
    .filter((lock) => lock.status === "Wishlist")
    .flatMap((lock) => {
      const entry = catalog.get(lock.id);
      if (!entry) return [];
      const newMechanisms = lock.mechanisms.filter(
        (name) => !mechanisms.has(name.toLocaleLowerCase("en-US")),
      );
      const newFeatures = [...new Set(entry.features ?? [])].filter(
        (name) => !features.has(name.toLocaleLowerCase("en-US")),
      );
      return [{ lock, entry, newMechanisms, newFeatures }];
    })
    .sort(
      (a, b) =>
        b.newMechanisms.length - a.newMechanisms.length ||
        b.newFeatures.length - a.newFeatures.length ||
        a.lock.name.localeCompare(b.lock.name),
    );
}
