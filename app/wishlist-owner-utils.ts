import { beltOrder, type LockRecord } from "./data";

export type WishlistProfile = {
  id: string;
  name: string;
  url: string;
  locks: LockRecord[];
  refreshedAt: string;
};

export function matchWishlistOwners(active: WishlistProfile, candidates: WishlistProfile[]) {
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
  const owned = new Map(
    profiles.map((p) => [
      p.id,
      new Set(p.locks.filter((l) => l.status === "Owned").map((l) => l.id)),
    ]),
  );
  return active.locks
    .filter((l) => l.status === "Wishlist")
    .map((lock) => ({
      lock,
      owners: profiles
        .filter((p) => owned.get(p.id)?.has(lock.id))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.lock.name.localeCompare(b.lock.name));
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
