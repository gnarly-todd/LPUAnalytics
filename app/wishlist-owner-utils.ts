import { beltOrder, type LockRecord } from "./data";

export type WishlistProfile = {
  id: string;
  name: string;
  url: string;
  locks: LockRecord[];
  refreshedAt: string;
};

export function matchWishlistOwners(active: WishlistProfile, candidates: WishlistProfile[]) {
  const wishlist = active.locks.filter((lock) => lock.status === "Wishlist");
  if (!wishlist.length) return [];
  const profiles = [
    ...new Map(
      candidates
        .filter(
          (p) =>
            p.id !== active.id &&
            p.name.trim() &&
            !/^(no display name|anonymous|unnamed|undefined|null)$/i.test(p.name.trim()),
        )
        .map((p) => [p.id, p]),
    ).values(),
  ];
  // Index the wishlist once and visit each owned lock once. Sorting profiles
  // before indexing preserves the alphabetical owner order in every result.
  const ownersByLock = new Map(wishlist.map((lock) => [lock.id, [] as WishlistProfile[]]));
  profiles.sort((a, b) => a.name.localeCompare(b.name));
  for (const profile of profiles) {
    const seen = new Set<string>();
    for (const lock of profile.locks) {
      if (lock.status !== "Owned" || seen.has(lock.id)) continue;
      const owners = ownersByLock.get(lock.id);
      if (owners) {
        owners.push(profile);
        seen.add(lock.id);
      }
    }
  }
  return wishlist
    .map((lock) => ({ lock, owners: ownersByLock.get(lock.id)! }))
    .sort((a, b) => a.lock.name.localeCompare(b.lock.name));
}

export function rankWishlistOwnerMatches(rows: ReturnType<typeof matchWishlistOwners>) {
  const byOwner = new Map<string, { profile: WishlistProfile; locks: Map<string, LockRecord> }>();
  for (const { lock, owners } of rows) {
    for (const profile of owners) {
      let match = byOwner.get(profile.id);
      if (!match) {
        match = { profile, locks: new Map() };
        byOwner.set(profile.id, match);
      }
      match.locks.set(lock.id, lock);
    }
  }
  return [...byOwner.values()]
    .map(({ profile, locks }) => ({ profile, locks: [...locks.values()] }))
    .sort(
      (a, b) =>
        b.locks.length - a.locks.length ||
        a.profile.name.localeCompare(b.profile.name) ||
        a.profile.id.localeCompare(b.profile.id),
    );
}

export type WishlistSort = {
  key: "lock" | "rank" | "owners" | "demand";
  direction: "asc" | "desc";
};

export function sortWishlistRows(
  rows: ReturnType<typeof matchWishlistOwners>,
  sort: WishlistSort,
  demand: Record<string, number> = {},
) {
  const compareText = (a: string, b: string) =>
    a.localeCompare(b, "en", { numeric: true, sensitivity: "base" });
  const compareLocks = (a: LockRecord, b: LockRecord) =>
    compareText(a.name, b.name) ||
    compareText(a.version ?? "", b.version ?? "") ||
    a.id.localeCompare(b.id);
  const rank = (lock: LockRecord) =>
    lock.belt === "Unranked"
      ? -1
      : beltOrder.indexOf(lock.belt) +
        (lock.belt === "Black" ? Number(lock.beltLevel?.match(/[1-5]$/)?.[0] ?? 0) / 10 : 0);
  return [...rows].sort((a, b) => {
    const primary =
      sort.key === "lock"
        ? compareLocks(a.lock, b.lock)
        : sort.key === "rank"
          ? rank(a.lock) - rank(b.lock)
          : sort.key === "demand"
            ? (demand[a.lock.id] ?? 0) - (demand[b.lock.id] ?? 0)
            : a.owners.length - b.owners.length;
    return (sort.direction === "asc" ? primary : -primary) || compareLocks(a.lock, b.lock);
  });
}
