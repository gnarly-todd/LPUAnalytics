"use client";

import {
  cloudScansAvailable,
  readCloudScan,
  loadCloudOwnerSnapshots,
  stopCloudScan,
} from "./cloud-owner-scans";
import ServerScanStatus from "./server-scan-progress";
import { useEffect, useMemo, useRef, useState } from "react";
import { beltColors, type LockRecord } from "./data";
import { useCommunityInsights } from "./community-insights";
import {
  ActivityStatus,
  DataTimestamp,
  formatActivityTime,
  useActivityTimestamps,
} from "./activity-status";
import {
  fetchTopOwners,
  hydrateOwnerCache,
  loadOwnerSnapshots,
  readOwnerCache,
  readOwnerDirectory,
  readOwnerScope,
  writeOwnerScope,
  selectOwnerCandidates,
  snapshotProfile,
  TOP_OWNER_LIMIT,
  type TopOwnerDirectory,
  type ServerScanProgress,
} from "./top-owner-profiles";
import {
  matchWishlistOwners,
  sortWishlistRows,
  type WishlistSort,
  type WishlistProfile,
} from "./wishlist-owner-utils";

export default function WishlistOwnerTable({
  activeProfile,
  loading,
  paused = false,
}: {
  activeProfile: WishlistProfile;
  loading: boolean;
  paused?: boolean;
}) {
  const { data: insightData } = useCommunityInsights();
  const scanRequested = useRef(false);
  const moreDialog = useRef<HTMLDialogElement | null>(null);
  const [moreCount, setMoreCount] = useState("50");
  const [moreError, setMoreError] = useState("");
  const [backgroundState, setBackgroundState] = useState("");
  const [serverProgress, setServerProgress] = useState<ServerScanProgress | undefined>();
  const [progressClock, setProgressClock] = useState(0);
  const [resumeAt, setResumeAt] = useState(0);
  const [pauseMessage, setPauseMessage] = useState("");
  const forceRefresh = useRef(false);
  const scanController = useRef<AbortController | null>(null);
  const [directory, setDirectory] = useState<TopOwnerDirectory | null>(null);
  const [directoryError, setDirectoryError] = useState("");
  const [exportError, setExportError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [loaded, setLoaded] = useState<WishlistProfile[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const retryAt = serverProgress?.retryAt || 0;
    if (!busy || !retryAt || progressClock >= retryAt) return;
    if (!progressClock) {
      setProgressClock(Date.now());
      return;
    }
    const timer = window.setTimeout(() => setProgressClock(Date.now()), 1000);
    return () => window.clearTimeout(timer);
  }, [serverProgress?.retryAt, progressClock, busy]);
  const activity = useActivityTimestamps();
  const setScanBusy = (value: boolean) => {
    if (value) activity.start();
    else activity.finish();
    setBusy(value);
  };
  const [refresh, setRefresh] = useState(0);
  const [processed, setProcessed] = useState(0);
  const [cacheCount, setCacheCount] = useState(0);
  const [freshCount, setFreshCount] = useState(0);
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(30);
  const [sort, setSort] = useState<WishlistSort>({ key: "lock", direction: "asc" });
  const [scope, setScope] = useState(() => ({
    profileId: activeProfile.id,
    count: TOP_OWNER_LIMIT,
  }));
  useEffect(() => {
    setResumeAt(0);
    setPauseMessage("");
    setBackgroundState("");
    setServerProgress(undefined);
    setProgressClock(0);
    setScope({ profileId: activeProfile.id, count: readOwnerScope(activeProfile.id) });
  }, [activeProfile.id]);
  const requestedCount =
    scope.profileId === activeProfile.id ? scope.count : readOwnerScope(activeProfile.id);
  const members = useMemo(
    () => selectOwnerCandidates(directory?.profiles ?? [], activeProfile.id, requestedCount),
    [directory, activeProfile.id, requestedCount],
  );

  useEffect(() => {
    if (loading || paused) {
      setScanBusy(false);
      return;
    }
    const savedScan = cloudScansAvailable() ? readCloudScan(activeProfile.id) : null;
    if (!scanRequested.current && !savedScan) {
      // Opening the page and switching profiles only read local snapshots.
      // Network requests require an explicit press of a load/fetch action.
      const cached = readOwnerDirectory();
      let cancelled = false;
      if (cached) {
        setDirectory(cached);
        // Restore every valid cached owner, including batches loaded for another
        // wishlist and a reserve owner used when that profile was excluded.
        const candidates = cached.profiles.filter((member) => member.id !== activeProfile.id);
        const restore = () => {
          if (cancelled) return;
          let count = Math.max(requestedCount, readOwnerScope(activeProfile.id));
          const cachedProfiles = candidates.flatMap((member, index) => {
            const snapshot = readOwnerCache(member.id);
            if (!snapshot) return [];
            count = Math.max(count, index + 1);
            return [snapshotProfile(snapshot)];
          });
          writeOwnerScope(activeProfile.id, count);
          if (count !== requestedCount) setScope({ profileId: activeProfile.id, count });
          setLoaded(cachedProfiles);
          setProcessed(cachedProfiles.length);
          setCacheCount(cachedProfiles.length);
          setFreshCount(0);
        };
        restore();
        void hydrateOwnerCache(candidates).then(restore);
      }
      setScanBusy(false);
      return () => {
        cancelled = true;
      };
    }
    scanRequested.current = false;
    const controller = new AbortController();
    scanController.current = controller;
    const signal = controller.signal;
    const force = forceRefresh.current;
    forceRefresh.current = false;
    setResumeAt(0);
    setPauseMessage("");
    setBackgroundState("");
    setServerProgress(undefined);
    setProgressClock(0);
    setErrors({});
    setDirectoryError("");
    setProcessed(0);
    setCacheCount(0);
    setFreshCount(0);
    setScanBusy(true);
    async function run() {
      if (!activeProfile.locks.some((lock) => lock.status === "Wishlist")) {
        setScanBusy(false);
        return;
      }
      const top = await fetchTopOwners(signal, force);
      if (signal.aborted) return;
      setDirectory(top);
      const candidates = selectOwnerCandidates(top.profiles, activeProfile.id, requestedCount);
      if (cloudScansAvailable()) {
        await loadCloudOwnerSnapshots(activeProfile.id, candidates, {
          force,
          signal,
          onProgress: (progress) => {
            setLoaded(progress.snapshots.map(snapshotProfile));
            setProcessed(progress.processed);
            setCacheCount(progress.cached);
            setFreshCount(progress.fresh);
            setErrors(progress.errors);
            setBackgroundState(progress.backgroundState || "");
            if (progress.serverProgress) setServerProgress(progress.serverProgress);
            setResumeAt(progress.rateLimit?.retryAt || 0);
            setPauseMessage(progress.rateLimit?.message || "");
          },
        });
        if (!signal.aborted) setScanBusy(false);
        return;
      }
      const resolved = new Map<string, { fetchedAt: number; profile: WishlistProfile }>();
      const completed = new Set<string>();
      while (!signal.aborted) {
        const result = await loadOwnerSnapshots(candidates, {
          completed,
          signal,
          force,
          onProgress: (progress) => {
            setLoaded(
              progress.snapshots.map((snapshot) => {
                const previous = resolved.get(snapshot.id);
                if (previous?.fetchedAt === snapshot.fetchedAt) return previous.profile;
                const profile = snapshotProfile(snapshot);
                resolved.set(snapshot.id, { fetchedAt: snapshot.fetchedAt, profile });
                return profile;
              }),
            );
            setErrors(progress.errors);
            setProcessed(progress.processed);
            setCacheCount(progress.cached);
            setFreshCount(progress.fresh);
            if (progress.rateLimit) {
              setResumeAt(progress.rateLimit.retryAt);
              setPauseMessage(progress.rateLimit.message);
            }
          },
        });
        if (!result.rateLimit || signal.aborted) break;
        const retryAt = result.rateLimit.retryAt;
        setResumeAt(retryAt);
        setPauseMessage(result.rateLimit.message);
        await new Promise<void>((resolve, reject) => {
          const abort = () => {
            window.clearTimeout(timer);
            reject(signal.reason);
          };
          const timer = window.setTimeout(
            () => {
              signal.removeEventListener("abort", abort);
              resolve();
            },
            Math.max(1000, retryAt - Date.now()),
          );
          signal.addEventListener("abort", abort, { once: true });
          if (signal.aborted) abort();
        });
        setResumeAt(0);
        setPauseMessage("");
      }
      if (!signal.aborted) setScanBusy(false);
    }
    void run().catch((reason) => {
      if (!signal.aborted) {
        setDirectoryError(
          reason instanceof Error ? reason.message : "The leaderboard could not be loaded.",
        );
        setScanBusy(false);
      }
    });
    return () => {
      controller.abort();
      activity.finish();
    };
  }, [activeProfile, loading, paused, refresh, requestedCount]);

  const owners = useMemo(() => {
    const validIds = new Set(members.map((p) => p.id));
    return loaded.filter((p) => validIds.has(p.id));
  }, [loaded, members]);
  const matches = useMemo(
    () => matchWishlistOwners(activeProfile, owners),
    [activeProfile, owners],
  );
  const rows = useMemo(
    () => sortWishlistRows(matches, sort, insightData.demand),
    [matches, sort, insightData.demand],
  );
  const fetchedTimes = owners.map((owner) => Date.parse(owner.refreshedAt)).filter(Number.isFinite);
  const oldestFetchedAt = fetchedTimes.length ? Math.min(...fetchedTimes) : null;
  const newestFetchedAt = fetchedTimes.length ? Math.max(...fetchedTimes) : null;
  const search = query.trim().toLocaleLowerCase();
  const unmatchedRows = rows.filter((row) => !row.owners.length);
  const filteredRows = rows.filter(({ lock, owners: matched }) => {
    if (!matched.length) return false;
    return (
      !search ||
      [lock.name, lock.version, lock.beltLevel ?? lock.belt, ...matched.map((owner) => owner.name)]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase()
        .includes(search)
    );
  });
  const visibleRows = filteredRows.slice(0, visibleCount);
  useEffect(() => {
    setVisibleCount(30);
    setQuery("");
    setExportError("");
  }, [activeProfile.id]);
  const changeSort = (key: WishlistSort["key"]) => {
    setVisibleCount(30);
    setSort((current) => ({
      key,
      direction:
        current.key === key
          ? current.direction === "asc"
            ? "desc"
            : "asc"
          : key === "lock"
            ? "asc"
            : "desc",
    }));
  };
  const failed = members.filter((p) => errors[p.id]);
  const refreshOwners = (force = false) => {
    scanRequested.current = true;
    forceRefresh.current = force;
    setRefresh((n) => n + 1);
  };
  const exportSpreadsheet = async () => {
    if (loading || !directory || exporting) return;
    setExporting(true);
    setExportError("");
    try {
      const { wishlistOwnersWorkbook } = await import("./wishlist-owner-export");
      const bytes = wishlistOwnersWorkbook(activeProfile, owners, {
        totalProfiles: members.length,
        failedNames: failed.map((p) => p.name),
        searchScope: `Top ${members.length} other named public profiles by owned-lock count`,
        leaderboardUpdatedAt: directory.updatedAt,
        demand: { counts: insightData.demand, updatedAt: insightData.statsUpdatedAt },
      });
      const url = URL.createObjectURL(
        new Blob([bytes], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${activeProfile.name.replace(/[^a-z0-9]+/gi, "-") || "profile"}-wishlist-tracker.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    } catch (reason) {
      setExportError(
        reason instanceof Error
          ? reason.message
          : "The Excel export could not be created. Please try again.",
      );
    } finally {
      setExporting(false);
    }
  };

  const blocked = busy || loading || paused || resumeAt > Date.now() || !rows.length;
  const remainingProfiles = Math.max(
    0,
    (directory?.profiles.filter((profile) => profile.id !== activeProfile.id).length ?? 0) -
      members.length,
  );
  const matchedLockCount = matches.filter((row) => row.owners.length > 0).length;
  const hasFilters = !!search;
  const clearFilters = () => {
    setQuery("");
    setVisibleCount(30);
  };
  const emptyOwnerText =
    directoryError && !owners.length
      ? "Ownership data unavailable. Try loading again."
      : busy
        ? "Checking owner profiles…"
        : !owners.length
          ? "Not checked yet. Load owner profiles to find matches."
          : `No matches in ${owners.length} loaded profiles.`;
  const ownerCount = (count: number) => (owners.length ? count : busy ? "…" : "—");
  const stateLabel = loading
    ? "Loading your profile…"
    : busy && backgroundState === "submitting"
      ? "Sending scan to the server…"
      : busy && backgroundState === "queued"
        ? "Scan queued on the server — safe to lock your phone"
        : busy && pauseMessage
          ? "Cooldown — remaining profiles will load automatically"
          : busy
            ? directory
              ? `Checking ${processed} of ${members.length} profiles…`
              : "Loading the leaderboard…"
            : pauseMessage
              ? "Waiting for the LPU request cooldown"
              : paused
                ? "Owner checks paused while you use profile controls"
                : failed.length
                  ? "Some profiles could not be loaded"
                  : owners.length
                    ? `${owners.length} owner profiles loaded`
                    : "Ready when you are — load profiles to find owners";

  return (
    <section
      className="section wishlist-owner-section"
      id="wishlist-owners"
      aria-labelledby="wishlist-owner-heading"
    >
      <dialog
        ref={moreDialog}
        className="profile-modal owner-load-dialog"
        aria-labelledby="load-more-title"
      >
        <h2 id="load-more-title">Load more profiles</h2>
        <p>
          Choose how many additional ranked profiles to check. The scan automatically resumes after
          LPU cooldowns. You can minimize Safari or lock your phone; progress is saved on the
          server.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const additional = Number(moreCount);
            if (
              !/^\d+$/.test(moreCount.trim()) ||
              !Number.isSafeInteger(additional) ||
              additional < 1 ||
              additional > remainingProfiles
            ) {
              setMoreError(`Enter a whole number from 1 to ${remainingProfiles}.`);
              return;
            }
            const count = requestedCount + additional;
            writeOwnerScope(activeProfile.id, count);
            setScope({ profileId: activeProfile.id, count });
            moreDialog.current?.close();
            refreshOwners();
          }}
        >
          <label htmlFor="additional-owner-count">Additional profiles</label>
          <input
            id="additional-owner-count"
            type="text"
            inputMode="numeric"
            autoFocus
            value={moreCount}
            onChange={(event) => {
              setMoreCount(event.target.value);
              setMoreError("");
            }}
            aria-describedby="additional-owner-help"
            aria-invalid={!!moreError}
          />
          <small id="additional-owner-help">
            {remainingProfiles} more profiles available. Current range: {members.length}.
          </small>
          {moreError && <p role="alert">{moreError}</p>}
          <div className="modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => moreDialog.current?.close()}
            >
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={blocked}>
              Start loading
            </button>
          </div>
        </form>
      </dialog>
      <header className="wishlist-owner-intro">
        <p className="eyebrow">Wishlist connections</p>
        <h2 id="wishlist-owner-heading">{activeProfile.name}’s wishlist</h2>
        <p>
          Start with the top {TOP_OWNER_LIMIT} other named public LPU collections, then choose how
          many more to load. Your own profile is excluded. Select an owner’s name to visit their LPU
          profile.
        </p>
      </header>

      <div className="wishlist-scan-panel">
        <div className="wishlist-scan-heading">
          <h3>Load owner profiles</h3>
          <span className="wishlist-scope-badge">Manual refresh · 7-day cache</span>
        </div>
        <p className="wishlist-scan-help">
          Load top {requestedCount} — cache first reuses profiles saved on this device for up to 7
          days. Load more lets you choose how many additional profiles to fetch and saves each as it
          arrives. Rate limits pause the scan; it resumes automatically after each cooldown, even
          with Safari minimized or your phone locked. Keep going to 1,000 profiles or beyond while
          LPU allows requests. Fetch latest refreshes your selected range. Opening this screen or
          switching profiles reuses all valid cached owners on this device. New scans start with a
          server batch immediately. The background runner stays active through cooldowns; scheduled
          starts can be delayed.
        </p>
        <div className="wishlist-owner-toolbar">
          <div className="wishlist-owner-actions">
            <button
              className="primary-button"
              onClick={() => refreshOwners()}
              disabled={blocked}
              aria-busy={busy}
            >
              <OwnerActionIcon kind="load" />
              {busy ? "Loading profiles…" : `Load top ${requestedCount} — cache first`}
            </button>
            {directory && members.length > 0 && (
              <button
                className="secondary-button"
                disabled={blocked || remainingProfiles === 0}
                onClick={() => {
                  setMoreCount(String(Math.min(TOP_OWNER_LIMIT, remainingProfiles)));
                  setMoreError("");
                  moreDialog.current?.showModal();
                }}
              >
                <OwnerActionIcon kind="load" />
                {remainingProfiles === 0 ? "All ranked profiles selected" : "Load more"}
              </button>
            )}
            <button
              className="secondary-button"
              onClick={() => refreshOwners(true)}
              disabled={blocked}
              title="Fetch fresh data from LPU Belts for all ranked profiles, bypassing the seven-day cache"
            >
              <OwnerActionIcon kind="refresh" />
              Fetch latest from LPU Belts
            </button>
            {busy && (
              <button
                className="secondary-button"
                onClick={() => {
                  const stop = () => {
                    scanController.current?.abort();
                    setResumeAt(0);
                    setPauseMessage("");
                    setBackgroundState(cloudScansAvailable() ? "cancelled" : "");
                    setScanBusy(false);
                  };
                  if (cloudScansAvailable())
                    void stopCloudScan(activeProfile.id)
                      .then(stop)
                      .catch(() =>
                        setDirectoryError(
                          "The server scan could not be stopped. Please retry Stop loading.",
                        ),
                      );
                  else stop();
                }}
              >
                Stop loading
              </button>
            )}
          </div>
          <button
            className="secondary-button wishlist-export"
            onClick={exportSpreadsheet}
            disabled={loading || !rows.length || !directory || exporting}
            title="Download a formatted Excel tracker with Wishlist and Owner matches sheets, including every wishlist lock"
          >
            <OwnerActionIcon kind="export" />
            {exporting ? "Preparing Excel…" : "Export Excel"}
          </button>
        </div>
        {exportError && (
          <p className="wishlist-owner-warning" role="alert">
            {exportError}
          </p>
        )}
        <p className="wishlist-scan-state" role="status">
          <span className={`wishlist-state-dot ${busy ? "is-busy" : ""}`} aria-hidden="true" />
          {stateLabel}
        </p>
        {!!backgroundState && (
          <ServerScanStatus
            state={backgroundState}
            progress={serverProgress}
            busy={busy}
            now={progressClock}
          />
        )}
        {(busy || cacheCount > 0 || freshCount > 0) && (
          <div className="wishlist-scan-progress">
            {busy && !backgroundState && (
              <progress
                aria-label="Ranked profiles checked"
                value={processed}
                max={Math.max(1, members.length)}
              />
            )}
            <span>
              {cacheCount} loaded from cache · {freshCount} fetched from LPU Belts
            </span>
          </div>
        )}
        <div className="wishlist-data-times">
          <ActivityStatus label="Wishlist owner scan" timing={activity.timing} />
          {oldestFetchedAt !== null && (
            <p className="wishlist-owner-meta">
              Owner data fetched <DataTimestamp value={oldestFetchedAt} />
              {newestFetchedAt !== oldestFetchedAt && (
                <>
                  {" "}
                  through <DataTimestamp value={newestFetchedAt} />
                </>
              )}
              . Cached results retain their original fetch times.
            </p>
          )}
        </div>
      </div>

      {!!pauseMessage && (
        <div className="wishlist-owner-warning" role="status">
          <strong>Requests are temporarily limited</strong>
          <p>{pauseMessage}</p>
          <p>
            The remaining profiles will load automatically after <DataTimestamp value={resumeAt} />.
            Your phone can remain locked. Loaded matches remain available.
          </p>
        </div>
      )}
      {directoryError && (
        <div role="alert" className="wishlist-owner-warning">
          <strong>The leaderboard could not be loaded</strong>
          <p>{directoryError}</p>
          <button className="secondary-button" onClick={() => refreshOwners()} disabled={blocked}>
            Retry leaderboard
          </button>
        </div>
      )}
      {!!failed.length && (
        <div role="alert" className="wishlist-owner-warning">
          <strong>
            {failed.length} {failed.length === 1 ? "profile needs" : "profiles need"} another
            attempt
          </strong>
          <p>Results and exports include the profiles loaded so far.</p>
          <details>
            <summary>View profile errors</summary>
            <ul>
              {failed.map((p) => (
                <li key={p.id}>
                  <strong>{p.name}</strong>: {errors[p.id]}
                </li>
              ))}
            </ul>
          </details>
          <button className="secondary-button" onClick={() => refreshOwners()} disabled={blocked}>
            Retry owner profiles
          </button>
        </div>
      )}

      {loading ? (
        <div className="wishlist-empty-state" role="status">
          <h3>Loading your wishlist…</h3>
          <p>Results will follow the selected profile.</p>
        </div>
      ) : (
        <>
          <dl className="wishlist-summary-metrics" aria-label="Wishlist ownership summary">
            <div>
              <dt>Wishlist locks</dt>
              <dd>{rows.length}</dd>
              <dd className="wishlist-metric-note">In the selected profile</dd>
            </div>
            <div>
              <dt>With owners</dt>
              <dd>{owners.length ? matchedLockCount : "—"}</dd>
              <dd className="wishlist-metric-note">Wishlist locks with loaded matches</dd>
            </div>
            <div>
              <dt>Profiles loaded</dt>
              <dd>
                {owners.length}
                <span> / {directory ? members.length : requestedCount}</span>
              </dd>
              <dd className="wishlist-metric-note">Your own profile is excluded</dd>
            </div>
          </dl>
          {!rows.length ? (
            <div className="wishlist-empty-state">
              <h3>No wishlist locks yet</h3>
              <p>Add locks to this profile’s wishlist on LPU, then refresh the profile here.</p>
              <a
                className="secondary-button"
                href={activeProfile.url}
                target="_blank"
                rel="noreferrer"
              >
                Open LPU profile ↗
              </a>
            </div>
          ) : (
            <>
              <div className="wishlist-results-heading">
                <h3>Wishlist locks with owners</h3>
                <p>
                  Owner counts reflect loaded profiles only. Wishlist demand is the published number
                  of wishlists containing each lock.
                </p>
              </div>
              {owners.length > 0 && unmatchedRows.length > 0 && (
                <div className="wishlist-unmatched-message">
                  <p>
                    <strong>
                      {unmatchedRows.length} wishlist{" "}
                      {unmatchedRows.length === 1 ? "lock has" : "locks have"} no
                      {busy ? " matches so far" : " matched owners"}.
                    </strong>{" "}
                    These locks are omitted from the results below. Matches cover the{" "}
                    {owners.length} loaded profiles only
                    {busy ? "; this list updates as profiles load" : ""}.
                  </p>
                  <ul
                    className="wishlist-owner-links wishlist-unmatched-locks"
                    aria-label="Wishlist locks with no matched owners"
                  >
                    {unmatchedRows.map(({ lock }) => (
                      <li key={lock.id}>
                        <a
                          href={
                            lock.resourceLinks?.lpu || `https://lpubelts.com/locks/${lock.id}.html`
                          }
                          target="_blank"
                          rel="noreferrer"
                        >
                          {lock.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="wishlist-results-controls">
                <label className="wishlist-search">
                  Find a lock or owner
                  <input
                    type="search"
                    value={query}
                    placeholder="Lock, version, belt or owner"
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setVisibleCount(30);
                    }}
                  />
                </label>
                <label>
                  Sort by
                  <select
                    value={`${sort.key}:${sort.direction}`}
                    onChange={(event) => {
                      const [key, direction] = event.target.value.split(":") as [
                        WishlistSort["key"],
                        WishlistSort["direction"],
                      ];
                      setSort({ key, direction });
                      setVisibleCount(30);
                    }}
                  >
                    <option value="lock:asc">Lock: A–Z</option>
                    <option value="lock:desc">Lock: Z–A</option>
                    <option value="rank:desc">Rank: highest first</option>
                    <option value="rank:asc">Rank: lowest first</option>
                    <option value="owners:desc">Loaded owners: most first</option>
                    <option value="owners:asc">Loaded owners: fewest first</option>
                    <option value="demand:desc">Wishlist demand: most first</option>
                    <option value="demand:asc">Wishlist demand: fewest first</option>
                  </select>
                </label>
              </div>
              <div className="wishlist-results-meta">
                <p className="wishlist-result-count" role="status">
                  Showing {visibleRows.length} of {filteredRows.length} wishlist locks with owners
                  {hasFilters ? ` (${matchedLockCount} before search)` : ""}. Excel exports all{" "}
                  {rows.length}.
                </p>
                {hasFilters && (
                  <button className="wishlist-clear-filters" onClick={clearFilters}>
                    Clear filters
                  </button>
                )}
              </div>
              {!filteredRows.length ? (
                <div className="wishlist-empty-state">
                  <h3>
                    {hasFilters
                      ? "No locks match this search"
                      : owners.length
                        ? "No matched owners yet"
                        : "Load owner profiles to find matches"}
                  </h3>
                  <p>
                    {hasFilters ? "Try a different lock name, owner, or belt." : emptyOwnerText}
                  </p>
                  {hasFilters && (
                    <button className="secondary-button" onClick={clearFilters}>
                      Show all matched locks
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <ol className="wishlist-mobile-list" aria-label="Wishlist ownership results">
                    {visibleRows.map(({ lock, owners: matched }) => (
                      <li key={lock.id}>
                        <article className="wishlist-mobile-card">
                          <div className="wishlist-mobile-heading">
                            <h3>
                              <a
                                href={
                                  lock.resourceLinks?.lpu ||
                                  `https://lpubelts.com/locks/${lock.id}.html`
                                }
                                target="_blank"
                                rel="noreferrer"
                              >
                                {lock.name}
                                <span aria-hidden="true"> ↗</span>
                              </a>
                            </h3>
                          </div>
                          {lock.version && <p className="wishlist-lock-version">{lock.version}</p>}
                          <WishlistRank lock={lock} />
                          <dl className="wishlist-mobile-stats">
                            <div>
                              <dt>Loaded owners</dt>
                              <dd>{ownerCount(matched.length)}</dd>
                            </div>
                            <div>
                              <dt>Wishlist demand</dt>
                              <dd>{(insightData.demand[lock.id] ?? 0).toLocaleString("en-US")}</dd>
                            </div>
                          </dl>
                          <p className="wishlist-owner-list-label">Owner profiles</p>
                          <OwnerLinks matched={matched} emptyText={emptyOwnerText} />
                        </article>
                      </li>
                    ))}
                  </ol>
                  <div
                    className="wishlist-owner-scroll wishlist-desktop-results"
                    tabIndex={0}
                    role="region"
                    aria-label="Wishlist ownership table"
                  >
                    <table className="wishlist-owner-table">
                      <caption className="wishlist-sr-only">
                        {activeProfile.name}’s wishlist locks and matches in {owners.length} loaded
                        owner profiles. All matched owner names are listed.
                      </caption>
                      <colgroup>
                        <col className="wishlist-col-lock" />
                        <col className="wishlist-col-rank" />
                        <col className="wishlist-col-number" />
                        <col className="wishlist-col-demand" />
                        <col className="wishlist-col-owners" />
                      </colgroup>
                      <thead>
                        <tr>
                          {(
                            [
                              { key: "lock", label: "Wishlist lock" },
                              { key: "rank", label: "Belt rank" },
                              { key: "owners", label: "Loaded owners" },
                              { key: "demand", label: "Wishlist demand" },
                            ] as const
                          ).map(({ key, label }) => (
                            <th
                              key={key}
                              scope="col"
                              className={
                                key === "owners" || key === "demand"
                                  ? "wishlist-numeric"
                                  : undefined
                              }
                              aria-sort={
                                sort.key === key
                                  ? sort.direction === "asc"
                                    ? "ascending"
                                    : "descending"
                                  : "none"
                              }
                            >
                              <button
                                className="wishlist-sort-button"
                                type="button"
                                onClick={() => changeSort(key)}
                                title={`Sort by ${label.toLowerCase()}`}
                              >
                                {label}
                                <span aria-hidden="true">
                                  {sort.key === key ? (sort.direction === "asc" ? "↑" : "↓") : "↕"}
                                </span>
                              </button>
                            </th>
                          ))}
                          <th scope="col">Owner profiles</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleRows.map(({ lock, owners: matched }) => (
                          <tr key={`${activeProfile.id}-${lock.id}`}>
                            <th scope="row">
                              <a
                                className="wishlist-lock-link"
                                href={
                                  lock.resourceLinks?.lpu ||
                                  `https://lpubelts.com/locks/${lock.id}.html`
                                }
                                target="_blank"
                                rel="noreferrer"
                              >
                                {lock.name}
                                <span aria-hidden="true"> ↗</span>
                              </a>
                              {lock.version && <small>{lock.version}</small>}
                            </th>
                            <td>
                              <WishlistRank lock={lock} />
                            </td>
                            <td className="wishlist-numeric">
                              <span className="wishlist-owner-total">
                                {ownerCount(matched.length)}
                              </span>
                            </td>
                            <td
                              className="wishlist-numeric"
                              title={`Published wishlist count; source updated ${insightData.statsUpdatedAt}`}
                            >
                              {(insightData.demand[lock.id] ?? 0).toLocaleString("en-US")}
                            </td>
                            <td>
                              <OwnerLinks matched={matched} emptyText={emptyOwnerText} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {visibleRows.length < filteredRows.length && (
                    <button
                      className="secondary-button wishlist-show-more"
                      onClick={() => setVisibleCount((count) => count + 30)}
                    >
                      Show {Math.min(30, filteredRows.length - visibleRows.length)} more locks
                    </button>
                  )}
                </>
              )}
            </>
          )}
          <details className="wishlist-coverage-notes">
            <summary>About coverage, data freshness &amp; export</summary>
            <div>
              <p>
                Matches cover only the top {directory ? members.length : requestedCount} other named
                public leaderboard profiles, not every LPU account. Your profile is excluded before
                selecting the ranked profiles to check. Ownership does not imply willingness to sell
                or trade.
              </p>
              <p>
                Ownership is saved in this browser for up to 7 days. Fetch latest from LPU Belts
                refreshes the selected range; Load top {requestedCount} — cache first reuses valid
                saved results and fetches missing or expired profiles from LPU Belts. Excel exports
                every wishlist lock and all loaded matches, regardless of filters, including
                coverage and each owner’s original fetch time.
              </p>
              <dl>
                <div>
                  <dt>Leaderboard source updated</dt>
                  <dd>
                    <DataTimestamp value={directory?.updatedAt} />
                  </dd>
                </div>
                {directory?.fetchedAt && (
                  <div>
                    <dt>Leaderboard fetched</dt>
                    <dd>
                      <DataTimestamp value={directory.fetchedAt} />
                    </dd>
                  </div>
                )}
                <div>
                  <dt>Wishlist demand source updated</dt>
                  <dd>
                    <DataTimestamp value={insightData.statsUpdatedAt} />
                  </dd>
                </div>
              </dl>
            </div>
          </details>
        </>
      )}
    </section>
  );
}

function WishlistRank({ lock }: { lock: LockRecord }) {
  return (
    <span className="wishlist-rank-label">
      <i style={{ background: beltColors[lock.belt] }} aria-hidden="true" />
      {lock.beltLevel ?? lock.belt}
    </span>
  );
}

function OwnerActionIcon({ kind }: { kind: "load" | "refresh" | "export" }) {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === "load" ? (
        <>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 21v-3a6 6 0 0 1 12 0v3M17 5a3 3 0 0 1 0 6M21 21v-3a6 6 0 0 0-3-5" />
        </>
      ) : kind === "refresh" ? (
        <>
          <path d="M20 7v5h-5M4 17v-5h5" />
          <path d="M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1" />
        </>
      ) : (
        <>
          <path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4" />
        </>
      )}
    </svg>
  );
}

function OwnerLinks({ matched, emptyText }: { matched: WishlistProfile[]; emptyText: string }) {
  const links = (profiles: WishlistProfile[]) => (
    <ul className="wishlist-owner-links">
      {profiles.map((profile) => (
        <li key={profile.id}>
          <a
            href={profile.url}
            target="_blank"
            rel="noreferrer"
            title={`Profile fetched ${formatActivityTime(profile.refreshedAt)}`}
          >
            <span>{profile.name}</span>
            <span aria-hidden="true">↗</span>
          </a>
        </li>
      ))}
    </ul>
  );
  return matched.length ? links(matched) : <p className="wishlist-no-match">{emptyText}</p>;
}
