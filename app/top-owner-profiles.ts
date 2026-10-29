import { parseProfileDirectory, PROFILE_DIRECTORY_URL } from "./profile-name-search";
import type { WishlistProfile } from "./wishlist-owner-utils";
import { fetchLpuUser, LpuRateLimitError } from "./lpu-request";

export const TOP_OWNER_LIMIT = 50;
// Fifty is a batch size, not a cap on the ranked directory or accumulated scan.
export const OWNER_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
export type TopOwner = { id: string; name: string; url: string; ownedCount: number };
export type TopOwnerDirectory = { profiles: TopOwner[]; updatedAt: string; fetchedAt?: number };
export type OwnerSnapshot = { id: string; name: string; own: string[]; fetchedAt: number };
export const OWNER_SCAN_CONCURRENCY = 3;
export type ServerScanProgress = {
  total: number;
  processed: number;
  fresh: number;
  cached: number;
  failed: number;
  updatedAt: number;
  checkedAt: number;
  retryAt: number;
};
export type OwnerScanProgress = {
  serverProgress?: ServerScanProgress;
  backgroundState?: string;
  snapshots: OwnerSnapshot[];
  processed: number;
  total: number;
  cached: number;
  fresh: number;
  errors: Record<string, string>;
  rateLimit?: LpuRateLimitError;
};

export function selectTopOwners(value: unknown): TopOwnerDirectory {
  const named = parseProfileDirectory(value);
  const data = value as {
    data: { id: string; own?: unknown }[];
    metadata?: { updatedDateTime?: string };
  };
  const counts = new Map<string, number>();
  for (const item of data.data) {
    if (item && typeof item.own === "number" && Number.isFinite(item.own) && item.own >= 0)
      counts.set(item.id, Math.max(counts.get(item.id) ?? 0, item.own));
  }
  const profiles = named
    .filter((p) => counts.has(p.id))
    .map((p) => ({
      id: p.id,
      name: p.displayName,
      ownedCount: counts.get(p.id)!,
      url: `https://lpubelts.com/#/profile/${p.id}?name=${encodeURIComponent(p.displayName)}`,
    }))
    .sort((a, b) => b.ownedCount - a.ownedCount || a.id.localeCompare(b.id));
  if (!profiles.length) throw new Error("The public leaderboard has no named ownership profiles.");
  return { profiles, updatedAt: data.metadata?.updatedDateTime ?? "Not supplied" };
}

export function selectOwnerCandidates(
  profiles: TopOwner[],
  activeProfileId: string,
  count = TOP_OWNER_LIMIT,
): TopOwner[] {
  return profiles.filter((profile) => profile.id !== activeProfileId).slice(0, count);
}

const OWNER_SCOPE_KEY = "lpu-owner-scope-v2";
let ownerScope = TOP_OWNER_LIMIT;

export function readOwnerScope(profileId: string): number {
  for (const storage of ["localStorage", "sessionStorage"] as const) {
    try {
      const saved = window[storage];
      const keys = [OWNER_SCOPE_KEY, `lpu-owner-scope-v1-${profileId}`];
      // Migrate expanded ranges saved for any previously selected profile.
      for (let index = 0; index < saved.length; index++) {
        const key = saved.key(index);
        if (key?.startsWith("lpu-owner-scope-v1-")) keys.push(key);
      }
      for (const key of keys) {
        const count = Number(saved.getItem(key));
        if (Number.isSafeInteger(count) && count >= TOP_OWNER_LIMIT)
          ownerScope = Math.max(ownerScope, count);
      }
    } catch {
      /* Try the other cache. */
    }
  }
  return ownerScope;
}

export function writeOwnerScope(profileId: string, count: number) {
  if (!Number.isSafeInteger(count) || count < TOP_OWNER_LIMIT) return;
  ownerScope = Math.max(readOwnerScope(profileId), count);
  for (const storage of ["localStorage", "sessionStorage"] as const) {
    try {
      window[storage].setItem(OWNER_SCOPE_KEY, String(ownerScope));
    } catch {
      /* Loaded results remain usable when browser storage is unavailable. */
    }
  }
}

export async function fetchTopOwners(
  signal?: AbortSignal,
  force = false,
): Promise<TopOwnerDirectory> {
  const cached = readOwnerDirectory();
  const age = Date.now() - (cached?.fetchedAt ?? 0);
  if (!force && cached && cached.fetchedAt && age >= 0 && age < OWNER_CACHE_TTL) return cached;
  const response = await fetch(PROFILE_DIRECTORY_URL, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(25_000)])
      : AbortSignal.timeout(25_000),
  });
  if (!response.ok)
    throw new Error(`The public leaderboard could not be loaded (${response.status}).`);
  const directory = { ...selectTopOwners(await response.json()), fetchedAt: Date.now() };
  for (const storage of ["localStorage", "sessionStorage"] as const) {
    try {
      window[storage].setItem("lpu-owner-directory-v4", JSON.stringify(directory));
    } catch {
      /* The manual scan still works without persistent storage. */
    }
  }
  return directory;
}

export function readOwnerDirectory(): TopOwnerDirectory | null {
  for (const storage of ["localStorage", "sessionStorage"] as const) {
    try {
      const value = JSON.parse(window[storage].getItem("lpu-owner-directory-v4") || "null");
      if (
        !value ||
        !Array.isArray(value.profiles) ||
        !value.profiles.length ||
        typeof value.updatedAt !== "string"
      )
        continue;
      if (
        !value.profiles.every(
          (profile: TopOwner) =>
            typeof profile.id === "string" &&
            /^[A-Za-z0-9_-]{20,128}$/.test(profile.id) &&
            typeof profile.name === "string" &&
            typeof profile.url === "string" &&
            Number.isFinite(profile.ownedCount),
        )
      )
        continue;
      return {
        profiles: value.profiles,
        updatedAt: value.updatedAt,
        ...(Number.isFinite(value.fetchedAt) ? { fetchedAt: value.fetchedAt } : {}),
      };
    } catch {
      /* Try the other browser cache. */
    }
  }
  return null;
}

export function parseOwnerSnapshot(value: unknown, id: string, now = Date.now()): OwnerSnapshot {
  const body = value as {
    data?: { userId?: string; displayName?: string; collections?: { own?: unknown } };
  };
  const data = body?.data;
  if (data?.userId !== id) throw new Error("The LPU API returned a different profile.");
  const name = data.displayName?.trim();
  if (!name || /^(no display name|anonymous|unnamed|undefined|null)$/i.test(name))
    throw new Error("This profile does not publish a display name.");
  if (
    !Array.isArray(data.collections?.own) ||
    !data.collections.own.every((item) => typeof item === "string")
  )
    throw new Error("The LPU API did not return an owned-lock list.");
  return { id, name, own: [...new Set(data.collections.own)], fetchedAt: now };
}

export function snapshotProfile(snapshot: OwnerSnapshot): WishlistProfile {
  return {
    id: snapshot.id,
    name: snapshot.name,
    url: `https://lpubelts.com/#/profile/${snapshot.id}?name=${encodeURIComponent(snapshot.name)}`,
    refreshedAt: new Date(snapshot.fetchedAt).toISOString(),
    locks: snapshot.own.map((id) => ({
      id,
      name: id,
      status: "Owned",
      belt: "Unranked",
      picked: false,
      mechanisms: [],
    })),
  };
}

// IndexedDB keeps larger scans durable without Web Storage's small size limit.
// Web Storage remains readable for existing caches and restricted browsers.
const ownerMemory = new Map<string, OwnerSnapshot>();
let ownerDatabase: Promise<IDBDatabase | null> | undefined;
function openOwnerDatabase(): Promise<IDBDatabase | null> {
  if (!ownerDatabase)
    ownerDatabase = new Promise((resolve) => {
      try {
        if (!window.indexedDB) {
          resolve(null);
          return;
        }
        const request = window.indexedDB.open("lpu-owner-snapshots-v1", 1);
        request.onupgradeneeded = () => {
          request.result.createObjectStore("snapshots", { keyPath: "id" });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = request.onblocked = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  return ownerDatabase;
}

export async function hydrateOwnerCache(profiles: TopOwner[]): Promise<void> {
  const database = await openOwnerDatabase();
  if (!database || !profiles.length) return;
  await new Promise<void>((resolve) => {
    try {
      const transaction = database.transaction("snapshots", "readonly");
      const store = transaction.objectStore("snapshots");
      for (const { id } of profiles) {
        const request = store.get(id);
        request.onsuccess = () => {
          const snapshot = request.result as OwnerSnapshot | undefined;
          if (
            snapshot?.id === id &&
            (!ownerMemory.has(id) || snapshot.fetchedAt > ownerMemory.get(id)!.fetchedAt)
          )
            ownerMemory.set(id, snapshot);
        };
      }
      transaction.oncomplete = () => resolve();
      transaction.onerror = transaction.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function persistOwnerSnapshot(snapshot: OwnerSnapshot): Promise<void> {
  const database = await openOwnerDatabase();
  if (!database) return;
  await new Promise<void>((resolve) => {
    try {
      const transaction = database.transaction("snapshots", "readwrite");
      transaction.objectStore("snapshots").put(snapshot);
      transaction.oncomplete = () => resolve();
      transaction.onerror = transaction.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

export function readOwnerCache(id: string): OwnerSnapshot | null {
  let newest: OwnerSnapshot | null = null;
  for (const storage of ["memory", "localStorage", "sessionStorage"] as const) {
    try {
      const data =
        storage === "memory"
          ? ownerMemory.get(id)
          : (JSON.parse(
              window[storage].getItem(`lpu-top-owner-v1-${id}`) || "null",
            ) as OwnerSnapshot | null);
      const age = Date.now() - (data?.fetchedAt ?? 0);
      if (
        data?.id === id &&
        Number.isFinite(data.fetchedAt) &&
        age >= 0 &&
        age < OWNER_CACHE_TTL &&
        Array.isArray(data.own) &&
        data.own.every((item) => typeof item === "string") &&
        typeof data.name === "string" &&
        data.name.trim() &&
        !/^(no display name|anonymous|unnamed|undefined|null)$/i.test(data.name.trim()) &&
        (!newest || data.fetchedAt > newest.fetchedAt)
      )
        newest = data;
    } catch {
      /* Try the other cache if one is unavailable. */
    }
  }
  return newest;
}

export function writeOwnerCache(snapshot: OwnerSnapshot): Promise<void> {
  ownerMemory.set(snapshot.id, snapshot);
  for (const storage of ["localStorage", "sessionStorage"] as const) {
    try {
      window[storage].setItem(`lpu-top-owner-v1-${snapshot.id}`, JSON.stringify(snapshot));
    } catch {
      /* A failed cache write must not discard loaded results. */
    }
  }
  return persistOwnerSnapshot(snapshot);
}

export async function fetchOwnerSnapshot(id: string, signal?: AbortSignal): Promise<OwnerSnapshot> {
  // Only the approved public LPU user API is used. Never fall back to Firestore
  // or try another source after an access restriction.
  const response = await fetchLpuUser(id, signal, true);
  if (!response.ok) throw new Error(`LPU profile could not be loaded (${response.status}).`);
  return parseOwnerSnapshot(
    await response.json(),
    id,
    Number(response.headers.get("X-LPU-Fetched-At")) || Date.now(),
  );
}

export async function loadOwnerSnapshots(
  profiles: TopOwner[],
  {
    signal,
    force = false,
    completed = new Set<string>(),
    onProgress,
  }: {
    signal?: AbortSignal;
    force?: boolean;
    completed?: Set<string>;
    onProgress?: (progress: OwnerScanProgress) => void;
  } = {},
): Promise<OwnerScanProgress> {
  const candidates = [...new Map(profiles.map((profile) => [profile.id, profile])).values()];
  await hydrateOwnerCache(candidates);
  signal?.throwIfAborted();
  const snapshots = new Map<string, OwnerSnapshot>();
  for (const profile of candidates) {
    const cached = readOwnerCache(profile.id);
    if (cached) snapshots.set(profile.id, cached);
  }
  const pending = candidates.filter(
    (profile) => !completed.has(profile.id) && (force || !snapshots.has(profile.id)),
  );
  const checked = new Set([...completed].filter((id) => snapshots.has(id)));
  const errors: Record<string, string> = {};
  let processed = force ? checked.size : snapshots.size;
  let cursor = 0;
  let rateLimit: LpuRateLimitError | undefined;
  const progress = (): OwnerScanProgress => ({
    snapshots: candidates.flatMap((profile) =>
      snapshots.has(profile.id) ? [snapshots.get(profile.id)!] : [],
    ),
    processed,
    total: candidates.length,
    cached: [...snapshots.keys()].filter((id) => !checked.has(id)).length,
    fresh: checked.size,
    errors: { ...errors },
    ...(rateLimit ? { rateLimit } : {}),
  });
  const publish = () => {
    if (!signal?.aborted) onProgress?.(progress());
  };
  signal?.throwIfAborted();
  publish();
  async function worker() {
    while (!signal?.aborted && !rateLimit && cursor < pending.length) {
      const profile = pending[cursor++];
      try {
        const snapshot = await fetchOwnerSnapshot(profile.id, signal);
        if (signal?.aborted) return;
        snapshots.set(profile.id, snapshot);
        checked.add(profile.id);
        completed.add(profile.id);
        await writeOwnerCache(snapshot);
      } catch (error) {
        if (signal?.aborted) return;
        if (error instanceof LpuRateLimitError) {
          rateLimit = error;
          publish();
          return;
        }
        errors[profile.id] =
          error instanceof Error ? error.message : "Profile could not be loaded.";
      }
      processed++;
      publish();
    }
  }
  // Every batch shares LPU’s Retry-After cooldown. Keep only three requests
  // in flight, regardless of how far the user expands their scan.
  await Promise.all(
    Array.from({ length: Math.min(OWNER_SCAN_CONCURRENCY, pending.length) }, worker),
  );
  signal?.throwIfAborted();
  return progress();
}
