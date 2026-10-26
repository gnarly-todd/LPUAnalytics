export const INSIGHT_SOURCES = {
  stats: "https://assets.lpubelts.com/data/collectionStatsCurrent.json",
  catalog:
    "https://raw.githubusercontent.com/Lockpickers-United/lpu-belt-explorer/main/apps/web/src/data/data.json",
  votes:
    "https://raw.githubusercontent.com/Lockpickers-United/lpu-belt-explorer/main/apps/web/src/data/classification-votes-historical.json",
  picks: "https://assets.lpubelts.com/data/pickStats.json",
  discord: "https://assets.lpubelts.com/data/discordBeltCounts.json",
  reddit: "https://assets.lpubelts.com/data/redditBeltCounts.json",
  safes:
    "https://raw.githubusercontent.com/Lockpickers-United/lpu-belt-explorer/main/apps/web/src/data/safelocks.json",
};
const belts = ["White", "Yellow", "Orange", "Green", "Blue", "Purple", "Brown", "Red", "Black"];
const count = (value) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
const text = (value) => (typeof value === "string" ? value.trim() : "");
const strings = (value) =>
  Array.isArray(value)
    ? [...new Set(value.filter((item) => typeof item === "string" && item.trim()))]
    : [];

export function normalizeInsightSources(raw, now = new Date().toISOString()) {
  if (
    !Array.isArray(raw.catalog) ||
    !raw.catalog.length ||
    !raw.stats?.allUsers?.listStats?.own ||
    !raw.stats?.allUsers?.listStats?.picked ||
    !raw.stats?.allUsers?.listStats?.wishlist ||
    !raw.stats?.allUsers?.wishlistSavesById ||
    !raw.stats?.blackBeltOnly?.listStats?.own ||
    !Array.isArray(raw.votes) ||
    !raw.picks?.byLock ||
    !raw.discord ||
    !raw.reddit ||
    !Array.isArray(raw.safes)
  )
    throw new Error(
      "The public insight datasets are incomplete. The previous snapshot has been kept.",
    );
  const cohort = (source) =>
    Object.fromEntries(
      Object.entries(source.listStats).map(([key, value]) => [
        key,
        {
          users: count(value.userCount),
          average: count(value.averageSaves),
          maximum: count(value.maxSaves),
        },
      ]),
    );
  const catalog = raw.catalog
    .map((entry) => ({
      id: text(entry.id),
      name: (entry.makeModels ?? [])
        .map((part) => [part.make, part.model].filter(Boolean).join(" "))
        .join(" / "),
      version: text(entry.version),
      belt: text(entry.belt),
      makes: strings((entry.makeModels ?? []).map((part) => part.make)),
      mechanisms: strings(entry.lockingMechanisms),
      addedAt: text(entry.dateAdded),
      updatedAt: text(entry.lastUpdated),
      rankDate: text(entry.currentBeltDate),
      documentedPicks: count(raw.picks.byLock?.[entry.id]),
      popularity: count(entry.popularityIndex),
    }))
    .filter((entry) => entry.id && entry.name);
  if (catalog.length !== raw.catalog.length)
    throw new Error("The LPU catalog contains invalid entries.");
  const ids = new Set(catalog.map((entry) => entry.id));
  if (ids.size !== catalog.length)
    throw new Error(
      "The public catalog contains duplicate IDs. The previous snapshot has been kept.",
    );
  const latestVotes = new Map();
  for (const vote of raw.votes) {
    if (
      !ids.has(vote.entryId) ||
      !/^(White|Yellow|Orange|Green|Blue|Purple|Brown|Red|Black(?: [1-5])?)$/.test(
        text(vote.votedBelt),
      )
    )
      continue;
    const key = `${vote.entryId}:${vote.userId || vote.displayName || vote.id}`;
    const previous = latestVotes.get(key);
    if (!previous || (Date.parse(vote.createdAt) || 0) >= (Date.parse(previous.createdAt) || 0))
      latestVotes.set(key, vote);
  }
  const votes = {};
  for (const vote of latestVotes.values()) {
    votes[vote.entryId] ??= {};
    votes[vote.entryId][vote.votedBelt] = (votes[vote.entryId][vote.votedBelt] ?? 0) + 1;
  }
  // Match LPU's published named belt categories; do not infer membership from
  // separate Dan labels, which may overlap other roles.
  const memberCounts = (source) => belts.map((belt) => count(source[`${belt} Belt`]));
  return {
    schemaVersion: 1,
    fetchedAt: now,
    statsUpdatedAt: text(raw.stats.metadata?.updatedDateTime),
    totalProfiles: count(raw.stats.allUsers.totalProfiles),
    cohorts: { all: cohort(raw.stats.allUsers), black: cohort(raw.stats.blackBeltOnly) },
    demand: Object.fromEntries(
      Object.entries(raw.stats.allUsers.wishlistSavesById ?? {}).map(([id, value]) => [
        id,
        count(value),
      ]),
    ),
    catalog,
    votes,
    voteCount: latestVotes.size,
    safeCatalog: raw.safes.map((entry) => ({
      id: text(entry.id),
      name: [entry.make, entry.model].filter(Boolean).join(" "),
      tier: text(entry.tier),
    })),
    memberBelts: [
      { platform: "Discord", counts: memberCounts(raw.discord) },
      { platform: "Reddit", counts: memberCounts(raw.reddit) },
    ],
    sources: INSIGHT_SOURCES,
  };
}

export async function fetchInsightSources(signal) {
  const entries = await Promise.all(
    Object.entries(INSIGHT_SOURCES).map(async ([key, url]) => {
      const response = await fetch(url, {
        cache: "no-store",
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(30_000)])
          : AbortSignal.timeout(30_000),
      });
      if (!response.ok)
        throw new Error(
          `The ${key} dataset could not be loaded (${response.status}). Previous insights remain available.`,
        );
      return [key, await response.json()];
    }),
  );
  return normalizeInsightSources(Object.fromEntries(entries));
}
