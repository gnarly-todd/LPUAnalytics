import {
  hydrateOwnerCache,
  readOwnerCache,
  writeOwnerCache,
  type OwnerSnapshot,
  type OwnerScanProgress,
  type TopOwner,
} from "./top-owner-profiles";
import { LpuRateLimitError } from "./lpu-request";
const ENDPOINT = "https://todd-lpu-profile-relay.nicelife70117.chatgpt.site/api/owner-scans";
type CloudStatus = {
  id: string;
  state: string;
  total: number;
  processed: number;
  cached: number;
  fresh: number;
  errors: Record<string, string>;
  retryAt: number;
  updatedAt: number;
  snapshots: OwnerSnapshot[];
  nextCursor: number;
  hasMore: boolean;
  message?: string;
  receivedAt?: number;
  runnerLastSeenAt?: number;
};
type SavedScan = { id: string; ids: string[]; force: boolean; count: number; createdAt: number };
const key = (profileId: string) => `lpu-cloud-scan-v1-${profileId}`;
export function cloudScansAvailable(): boolean {
  return typeof window !== "undefined" && !!window.location;
}
export function readCloudScan(profileId: string): SavedScan | null {
  for (const storage of ["localStorage", "sessionStorage"] as const) {
    try {
      const saved = JSON.parse(window[storage].getItem(key(profileId)) || "null");
      if (
        saved &&
        /^[a-f0-9-]{36}$/.test(saved.id) &&
        Array.isArray(saved.ids) &&
        saved.createdAt > Date.now() - 7 * 86400_000
      )
        return saved;
    } catch {
      /* Try the other browser store. */
    }
  }
  return null;
}
function saveScan(profileId: string, scan: SavedScan) {
  let saved = false;
  for (const storage of ["localStorage", "sessionStorage"] as const) {
    try {
      window[storage].setItem(key(profileId), JSON.stringify(scan));
      saved = true;
    } catch {
      /* Try the other store. */
    }
  }
  if (!saved)
    throw new Error("Enable browser storage to save and restore background scan progress.");
}
function clearScan(profileId: string) {
  for (const storage of ["localStorage", "sessionStorage"] as const) {
    try {
      window[storage].removeItem(key(profileId));
    } catch {
      /* Results remain in the owner cache. */
    }
  }
}
class ScanRequestError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
async function request(url: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    signal: init.signal
      ? AbortSignal.any([init.signal, AbortSignal.timeout(30_000)])
      : AbortSignal.timeout(30_000),
    cache: "no-store",
  });
  const body = (await response.json().catch(() => ({}))) as CloudStatus;
  if (!response.ok)
    throw new ScanRequestError(
      body.message || `Background scan service returned ${response.status}.`,
      response.status,
    );
  return body;
}
export async function stopCloudScan(profileId: string): Promise<void> {
  const saved = readCloudScan(profileId);
  if (!saved) return;
  await request(`${ENDPOINT}/${saved.id}`, { method: "DELETE" });
  clearScan(profileId);
}
function waitForUpdate(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      window.clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("focus", visible);
    };
    const finish = () => {
      cleanup();
      resolve();
    };
    const abort = () => {
      cleanup();
      reject(signal.reason);
    };
    const visible = () => {
      if (!document.hidden) finish();
    };
    const timer = window.setTimeout(finish, 15_000);
    signal.addEventListener("abort", abort, { once: true });
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("focus", visible);
    if (signal.aborted) abort();
  });
}
export async function loadCloudOwnerSnapshots(
  profileId: string,
  candidates: TopOwner[],
  {
    force = false,
    signal,
    onProgress,
  }: { force?: boolean; signal: AbortSignal; onProgress: (progress: OwnerScanProgress) => void },
): Promise<void> {
  await hydrateOwnerCache(candidates);
  signal.throwIfAborted();
  const snapshots = new Map<string, OwnerSnapshot>();
  for (const candidate of candidates) {
    const saved = readOwnerCache(candidate.id);
    if (saved) snapshots.set(candidate.id, saved);
  }
  let job = readCloudScan(profileId);
  const ids = candidates.filter((p) => force || !snapshots.has(p.id)).map((p) => p.id);
  const initialCached = snapshots.size;
  const publish = (progress?: {
    processed: number;
    cached: number;
    fresh: number;
    errors: Record<string, string>;
    retryAt: number;
    state: string;
    total?: number;
    updatedAt?: number;
    receivedAt?: number;
    runnerLastSeenAt?: number;
  }) => {
    if (signal.aborted) return;
    onProgress({
      snapshots: candidates.flatMap((p) => (snapshots.has(p.id) ? [snapshots.get(p.id)!] : [])),
      total: candidates.length,
      processed: progress
        ? Math.min(
            candidates.length,
            (job?.force ? 0 : candidates.length - job!.ids.length) + progress.processed,
          )
        : force
          ? 0
          : initialCached,
      cached: progress ? Math.max(0, snapshots.size - progress.fresh) : initialCached,
      fresh: progress?.fresh || 0,
      errors: progress?.errors || {},
      ...(progress && progress.retryAt > Date.now()
        ? { rateLimit: new LpuRateLimitError(progress.retryAt) }
        : {}),
      backgroundState: progress?.state || (job || ids.length ? "submitting" : ""),
      ...(progress && Number.isFinite(progress.updatedAt)
        ? {
            serverProgress: {
              total: progress.total ?? job?.ids.length ?? 0,
              processed: progress.processed,
              fresh: progress.fresh,
              cached: progress.cached,
              failed: Object.keys(progress.errors).length,
              updatedAt: progress.updatedAt!,
              checkedAt: progress.receivedAt ?? Date.now(),
              runnerLastSeenAt: progress.runnerLastSeenAt || 0,
              retryAt: progress.retryAt,
            },
          }
        : {}),
    });
  };
  publish();
  if (!job && !ids.length) return;
  if (!job) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    job = { id, ids, force, count: candidates.length, createdAt: Date.now() };
    // Save before POST: reopening can retry the same idempotent submission.
    saveScan(profileId, job);
  }
  let latestStatus: CloudStatus | undefined;
  const reconnectingRequest = async (url: string, init: RequestInit) => {
    for (;;) {
      try {
        return await request(url, init);
      } catch (reason) {
        if (signal.aborted) throw reason;
        if (
          reason instanceof ScanRequestError &&
          reason.status >= 400 &&
          reason.status < 500 &&
          ![408, 429].includes(reason.status)
        ) {
          if (reason.status === 404) clearScan(profileId);
          throw reason;
        }
        if (latestStatus) publish({ ...latestStatus, state: "reconnecting" });
        // Safari can discard an in-flight request while the phone is locked.
        // Reconnect to the same durable job without starting another scan.
        await waitForUpdate(signal);
      }
    }
  };
  await reconnectingRequest(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(job),
    signal,
  });
  publish({
    processed: 0,
    cached: initialCached,
    fresh: 0,
    errors: {},
    retryAt: 0,
    state: "queued",
  });
  let cursor = 0;
  while (!signal.aborted) {
    // Nudge a bounded server batch immediately while the page is available.
    // The durable runner continues the rest when the browser is suspended.
    if (!latestStatus?.retryAt || latestStatus.retryAt <= Date.now()) {
      await request(`${ENDPOINT}/${job.id}?action=advance`, { method: "POST", signal }).catch(
        (reason) => {
          if (signal.aborted) throw reason;
        },
      );
    }
    const status = await reconnectingRequest(`${ENDPOINT}/${job.id}?cursor=${cursor}`, { signal });
    if (
      !Array.isArray(status.snapshots) ||
      !Number.isSafeInteger(status.nextCursor) ||
      status.nextCursor < cursor
    )
      throw new Error("Background scan returned invalid progress.");
    for (const snapshot of status.snapshots as OwnerSnapshot[]) {
      if (
        !job.ids.includes(snapshot.id) ||
        !Array.isArray(snapshot.own) ||
        !snapshot.own.every((id) => typeof id === "string") ||
        typeof snapshot.name !== "string" ||
        !Number.isFinite(snapshot.fetchedAt)
      )
        throw new Error("Background scan returned an invalid profile.");
      snapshots.set(snapshot.id, snapshot);
      await writeOwnerCache(snapshot);
    }
    cursor = status.nextCursor;
    latestStatus = { ...status, receivedAt: Date.now() };
    publish(latestStatus);
    if (status.hasMore) continue;
    if (["complete", "cancelled"].includes(status.state)) {
      clearScan(profileId);
      return;
    }
    await waitForUpdate(signal);
  }
}
