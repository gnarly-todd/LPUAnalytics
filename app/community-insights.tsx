"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import snapshot from "./community-insights-data.json";
import { LearningPlanner } from "./learning-planner";
import { CollectionBenchmarkCards } from "./collection-mobile";
import { fetchInsightSources } from "./insight-sources.mjs";
import {
  ActivityStatus,
  DataTimestamp,
  useActivityTimestamps,
  type ActivityTiming,
} from "./activity-status";
import {
  catalogCoverage,
  challengeSuggestions,
  formatInsightDate,
  profileMetric,
  validInsightsData,
  voteSummary,
  type InsightProfile,
  type InsightsData,
} from "./insights-model";
import "./community-insights.css";

const initial = snapshot as InsightsData;
const InsightsContext = createContext({
  data: initial,
  updating: false,
  error: "",
  timing: { startedAt: null, finishedAt: null } as ActivityTiming,
  refresh: async () => {},
});
const CACHE_KEY = "lpu-community-insights-v1";
const formatNumber = (value: number) => value.toLocaleString("en-US", { maximumFractionDigits: 1 });
const formatDate = formatInsightDate;
const lockLink = (id: string) => `https://lpubelts.com/locks/${encodeURIComponent(id)}.html`;

export function InsightsProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState(initial);
  const [updating, setUpdating] = useState(false);
  const activity = useActivityTimestamps();
  const [error, setError] = useState("");
  useEffect(() => {
    try {
      const cached: unknown = JSON.parse(window.localStorage.getItem(CACHE_KEY) || "null");
      if (
        validInsightsData(cached) &&
        Date.parse(cached.fetchedAt) > Date.parse(initial.fetchedAt) &&
        Date.parse(cached.fetchedAt) <= Date.now() &&
        Date.now() - Date.parse(cached.fetchedAt) < 24 * 60 * 60 * 1000
      )
        setData(cached);
    } catch {
      /* The bundled snapshot remains usable. */
    }
  }, []);
  const refresh = async () => {
    if (updating) return;
    activity.start();
    setUpdating(true);
    setError("");
    try {
      const next = await fetchInsightSources();
      if (!validInsightsData(next))
        throw new Error("The public insight datasets returned an unexpected format.");
      setData(next);
      try {
        window.localStorage.setItem(CACHE_KEY, JSON.stringify(next));
      } catch {
        /* Data remains available in memory. */
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Community data could not be updated. Your previous snapshot has been kept.",
      );
    } finally {
      setUpdating(false);
      activity.finish();
    }
  };
  return (
    <InsightsContext.Provider value={{ data, updating, error, refresh, timing: activity.timing }}>
      {children}
    </InsightsContext.Provider>
  );
}

export const useCommunityInsights = () => useContext(InsightsContext);

export function CommunityBenchmarks({ profile }: { profile: InsightProfile }) {
  const { data } = useCommunityInsights();
  const rows = [
    { key: "own", label: "Owned" },
    { key: "picked", label: "Picked" },
    { key: "wishlist", label: "Wishlist" },
    { key: "recorded", label: "Recorded" },
    { key: "recordedLocks", label: "Scorecard locks" },
  ];
  return (
    <article className="panel community-benchmark-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">Published LPU collections</p>
          <h3>How {profile.name} compares</h3>
        </div>
      </div>
      <CollectionBenchmarkCards
        rows={rows.map(({ key, label }) => ({
          key,
          label,
          value: profileMetric(profile, key),
          communityAverage: data.cohorts.all[key]?.average ?? null,
          blackAverage: data.cohorts.black[key]?.average ?? null,
        }))}
      />
      <div
        className="insight-table-scroll collection-benchmark-desktop"
        tabIndex={0}
        role="region"
        aria-label="Published LPU collections comparison table"
      >
        <table className="insight-table">
          <thead>
            <tr>
              <th>Collection</th>
              <th>{profile.name}</th>
              <th>Community average</th>
              <th>Black-belt average</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ key, label }) => {
              const value = profileMetric(profile, key);
              const all = data.cohorts.all[key],
                black = data.cohorts.black[key];
              return (
                <tr key={key}>
                  <th scope="row">{label}</th>
                  <td>{value === null ? "Not loaded" : value}</td>
                  <td
                    title={`${all?.users ?? 0} profiles with a nonempty ${label.toLowerCase()} list`}
                  >
                    {all ? formatNumber(all.average) : "Not supplied"}
                  </td>
                  <td title={`${black?.users ?? 0} black-belt profiles with a nonempty list`}>
                    {black ? formatNumber(black.average) : "Not supplied"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="chart-note">
        Each average includes profiles with a nonempty list in that category. Black-belt averages
        use LPU’s published cohort. Your counts use unique lock IDs; published averages follow LPU’s
        counters. Picked includes locks outside Owned. Recorded and scorecard entries remain
        separate from picked status.
      </p>
      <p className="insight-source">
        Source updated <DataTimestamp value={data.statsUpdatedAt} /> ·{" "}
        {data.totalProfiles.toLocaleString("en-US")} indexed profiles ·{" "}
        <a href={data.sources.stats} target="_blank" rel="noreferrer">
          Source data
        </a>
      </p>
    </article>
  );
}

export function ExpandedInsights({
  profile,
  onRefreshProfile,
}: {
  profile: InsightProfile;
  onRefreshProfile: () => void;
}) {
  const { data, updating, error, refresh, timing } = useCommunityInsights();
  const [coverageGroup, setCoverageGroup] = useState<"belt" | "make" | "mechanism">("belt");
  const [coverageFilter, setCoverageFilter] = useState("");
  const [voteScope, setVoteScope] = useState<"All tracked" | "Owned" | "Wishlist">("All tracked");
  const [minimumVotes, setMinimumVotes] = useState(3);
  const [voteLimit, setVoteLimit] = useState(12);
  const [updateScope, setUpdateScope] = useState<"Profile" | "Catalog">("Profile");
  const [updateKind, setUpdateKind] = useState<"All updates" | "Added" | "Rank dated">(
    "All updates",
  );
  const [coverageLimit, setCoverageLimit] = useState(15);
  const [updatesLimit, setUpdatesLimit] = useState(10);
  const catalogById = useMemo(
    () => new Map(data.catalog.map((entry) => [entry.id, entry])),
    [data],
  );
  const owned = profile.locks.filter((lock) => lock.status === "Owned");
  const ownedIds = new Set(owned.map((lock) => lock.id));
  const trackedIds = new Set(profile.locks.map((lock) => lock.id));
  const coverage = catalogCoverage(profile, data, coverageGroup).filter((row) =>
    row.label.toLocaleLowerCase().includes(coverageFilter.toLocaleLowerCase()),
  );
  const challenges = challengeSuggestions(profile, data).slice(0, 6);
  const votes = profile.locks
    .filter((lock) => voteScope === "All tracked" || lock.status === voteScope)
    .flatMap((lock) => {
      const entry = catalogById.get(lock.id);
      if (!entry) return [];
      return [{ lock, entry, ...voteSummary(entry, data) }];
    })
    .filter((row) => row.total >= minimumVotes && row.total > 0)
    .sort(
      (a, b) =>
        b.disagreement - a.disagreement ||
        b.total - a.total ||
        a.lock.name.localeCompare(b.lock.name),
    );
  const updateRows = data.catalog
    .filter(
      (entry) =>
        (updateScope === "Catalog" || trackedIds.has(entry.id)) &&
        (updateKind !== "Added" || !!entry.addedAt) &&
        (updateKind !== "Rank dated" || !!entry.rankDate),
    )
    .map((entry) => ({
      entry,
      date:
        updateKind === "Added"
          ? entry.addedAt
          : updateKind === "Rank dated"
            ? entry.rankDate
            : [entry.updatedAt, entry.addedAt, entry.rankDate]
                .filter((value): value is string => !!value && Number.isFinite(Date.parse(value)))
                .sort((a, b) => Date.parse(b) - Date.parse(a))[0],
    }))
    .filter((row) => !!row.date && Number.isFinite(Date.parse(row.date)))
    .sort(
      (a, b) =>
        Date.parse(b.date!) - Date.parse(a.date!) || a.entry.name.localeCompare(b.entry.name),
    );
  const rankedCatalog = data.catalog.filter((entry) => entry.belt !== "Unranked");
  const rankedOwned = rankedCatalog.filter((entry) => ownedIds.has(entry.id)).length;
  const recorded = profile.collections?.recorded;
  const scorecard = profileMetric(profile, "recordedLocks");
  const safeOwn = profile.collections?.safelocksOwn;
  const safeCracked = profile.collections?.safelocksCracked;
  const safeWanted = profile.collections?.safelocksWishlist;
  const safeIds = new Set([...(safeOwn ?? []), ...(safeCracked ?? []), ...(safeWanted ?? [])]);
  const safeCatalog = new Map(data.safeCatalog.map((entry) => [entry.id, entry]));
  const scorecardIds = [
    ...new Set([
      ...(profile.collections?.scorecard ?? []),
      ...(profile.collections?.recordedLocks ?? []),
    ]),
  ];

  return (
    <section
      className="section expanded-insights"
      id="lpu-insights"
      aria-labelledby="lpu-insights-title"
    >
      <div className="section-heading insights-heading">
        <div>
          <span className="eyebrow">Beyond the collection</span>
          <h2 id="lpu-insights-title">More insights for {profile.name}</h2>
          <p>
            Community opinions, catalog coverage, and practice ideas based on this profile and LPU’s
            published datasets.
          </p>
        </div>
        <button className="secondary-button" disabled={updating} onClick={() => void refresh()}>
          {updating ? "Updating community data…" : "Update community data"}
        </button>
      </div>
      <p className="insight-source" role="status">
        Community snapshot fetched <DataTimestamp value={data.fetchedAt} />; collection statistics
        updated <DataTimestamp value={data.statsUpdatedAt} />. Profile snapshot:{" "}
        <DataTimestamp value={profile.refreshedAt} />. This button updates public datasets; use
        Refresh profile for your collection.
      </p>
      <ActivityStatus label="Community data update" timing={timing} />
      {error && (
        <p className="wishlist-owner-warning" role="alert">
          {error}
        </p>
      )}

      <nav className="insight-jumps" aria-label="Jump to an insight section">
        {[
          ["learning-planner-title", "Wishlist planner"],
          ["catalog-coverage", "Catalog coverage"],
          ["practice-ideas", "Practice ideas"],
          ["ranking-opinions", "Ranking opinions"],
          ["catalog-updates", "Catalog updates"],
          ["published-lists", "Other collections"],
        ].map(([id, label]) => (
          <button
            className="secondary-button"
            key={id}
            onClick={() => {
              const target = document.getElementById(id);
              target?.scrollIntoView({ behavior: "smooth", block: "start" });
              target?.focus({ preventScroll: true });
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      <LearningPlanner profile={profile} data={data} />

      <article className="panel insight-panel">
        <div className="panel-title">
          <div>
            <p className="eyebrow">Coverage</p>
            <h3 id="catalog-coverage" tabIndex={-1}>
              Your share of the LPU catalog
            </h3>
          </div>
          <span className="panel-badge">
            {rankedOwned}/{rankedCatalog.length} ranked entries ·{" "}
            {((rankedOwned / Math.max(1, rankedCatalog.length)) * 100).toFixed(1)}%
          </span>
        </div>
        <div className="insight-controls">
          <label>
            Group by{" "}
            <select
              value={coverageGroup}
              onChange={(event) => {
                setCoverageGroup(event.target.value as typeof coverageGroup);
                setCoverageLimit(15);
                setCoverageFilter("");
              }}
            >
              <option value="belt">Belt rank</option>
              <option value="make">Manufacturer</option>
              <option value="mechanism">Mechanism</option>
            </select>
          </label>
          <label>
            Find a group{" "}
            <input
              value={coverageFilter}
              onChange={(event) => {
                setCoverageFilter(event.target.value);
                setCoverageLimit(15);
              }}
              placeholder="Filter coverage…"
            />
          </label>
        </div>
        <div className="insight-coverage">
          {coverage.slice(0, coverageLimit).map((row) => (
            <div className="insight-coverage-row" key={row.label}>
              <span>{row.label}</span>
              <progress
                value={row.owned}
                max={row.total}
                aria-label={`${row.label}: ${row.owned} of ${row.total} catalog entries owned`}
              />
              <strong>
                <span className="coverage-owned-label">Owned </span>
                {row.owned}/{row.total}
              </strong>
              <small>{row.percent.toFixed(1)}%</small>
            </div>
          ))}
        </div>
        {!coverage.length && <p>No catalog groups match this filter.</p>}
        {coverage.length > coverageLimit && (
          <button
            className="secondary-button"
            onClick={() => setCoverageLimit((value) => value + 20)}
          >
            Show more groups
          </button>
        )}
        <p className="chart-note">
          Coverage counts catalog entries, not physical copies. An entry with several manufacturers
          or mechanisms appears in each relevant group. Unranked entries are shown separately.
        </p>
      </article>

      <article className="panel insight-panel">
        <div className="panel-title">
          <div>
            <p className="eyebrow">Practice plan</p>
            <h3 id="practice-ideas" tabIndex={-1}>
              What to pick next
            </h3>
          </div>
          <span className="panel-badge">Ranked, owned, unpicked</span>
        </div>
        <p>
          Suggestions favor ranks near your next step, mechanisms absent from your picked locks, and
          locks with more documented community picks.
        </p>
        <div className="insight-challenges">
          {challenges.map(({ lock, documentedPicks, newMechanism }) => (
            <div key={lock.id}>
              <a href={lockLink(lock.id)} target="_blank" rel="noreferrer">
                {lock.name}
              </a>
              <strong>{lock.beltLevel ?? lock.belt}</strong>
              <p>{lock.mechanisms.join(" · ") || "Mechanism not supplied"}</p>
              <small>
                {documentedPicks} documented picks
                {newMechanism
                  ? " · Adds mechanism practice"
                  : " · Builds on your picked mechanisms"}
              </small>
            </div>
          ))}
        </div>
        {!challenges.length && (
          <p>No ranked, owned, unpicked locks are available for suggestions.</p>
        )}
        <p className="chart-note">
          Suggestions are a practice heuristic. Documented pick counts measure recorded activity;
          they do not measure failed attempts or your likelihood of success.
        </p>
      </article>

      <article className="panel insight-panel">
        <div className="panel-title">
          <div>
            <p className="eyebrow">Community opinions</p>
            <h3 id="ranking-opinions" tabIndex={-1}>
              How ranking votes compare
            </h3>
          </div>
          <span className="panel-badge">
            {data.voteCount.toLocaleString("en-US")} valid historical votes
          </span>
        </div>
        <div className="insight-controls">
          <label>
            Collection{" "}
            <select
              value={voteScope}
              onChange={(event) => {
                setVoteScope(event.target.value as typeof voteScope);
                setVoteLimit(12);
              }}
            >
              <option>All tracked</option>
              <option>Owned</option>
              <option>Wishlist</option>
            </select>
          </label>
          <label>
            Minimum votes{" "}
            <select
              value={minimumVotes}
              onChange={(event) => {
                setMinimumVotes(Number(event.target.value));
                setVoteLimit(12);
              }}
            >
              <option value={1}>1</option>
              <option value={3}>3</option>
              <option value={5}>5</option>
              <option value={10}>10</option>
            </select>
          </label>
        </div>
        <p className="scroll-hint">Swipe across for all columns. Row labels stay visible.</p>
        <div
          className="insight-table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Community insights table, scroll horizontally for all columns"
        >
          <table className="insight-table">
            <thead>
              <tr>
                <th>Lock</th>
                <th>Official rank</th>
                <th>Leading opinion</th>
                <th>Votes</th>
                <th>Agree with official</th>
              </tr>
            </thead>
            <tbody>
              {votes.slice(0, voteLimit).map((row) => (
                <tr key={row.lock.id}>
                  <th scope="row">
                    <a href={lockLink(row.lock.id)} target="_blank" rel="noreferrer">
                      {row.lock.name}
                    </a>
                    {row.lock.version && <small>{row.lock.version}</small>}
                  </th>
                  <td>{row.entry.belt}</td>
                  <td>
                    {row.leading.join(" / ")}
                    {row.leading.length > 1 && " (tie)"}
                  </td>
                  <td>
                    <details>
                      <summary>{row.total} votes</summary>
                      {Object.entries(row.counts).map(([belt, count]) => (
                        <div key={belt}>
                          {belt}: {count}
                        </div>
                      ))}
                    </details>
                  </td>
                  <td>{Math.round((row.agreement ?? 0) * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!votes.length && (
          <p>
            No votes for these tracked locks meet the minimum. Try a smaller minimum or a different
            collection.
          </p>
        )}
        {votes.length > voteLimit && (
          <button className="secondary-button" onClick={() => setVoteLimit((value) => value + 20)}>
            Show more voted locks
          </button>
        )}
        <p className="chart-note">
          Sorted by disagreement with the official rank, then sample size. One valid vote is counted
          per person and lock, using the latest source timestamp when duplicated. Opinions can
          reflect older versions or older official ranks and do not change the official
          classification.{" "}
          <a href={data.sources.votes} target="_blank" rel="noreferrer">
            Vote source
          </a>
        </p>
      </article>

      <article className="panel insight-panel">
        <div className="panel-title">
          <div>
            <p className="eyebrow">Catalog activity</p>
            <h3 id="catalog-updates" tabIndex={-1}>
              Recent additions and updates
            </h3>
          </div>
        </div>
        <div className="insight-controls">
          <label>
            Show{" "}
            <select
              value={updateScope}
              onChange={(event) => {
                setUpdateScope(event.target.value as typeof updateScope);
                setUpdatesLimit(10);
              }}
            >
              <option value="Profile">My owned and wishlist locks</option>
              <option value="Catalog">Entire catalog</option>
            </select>
          </label>
          <label>
            Activity{" "}
            <select
              value={updateKind}
              onChange={(event) => {
                setUpdateKind(event.target.value as typeof updateKind);
                setUpdatesLimit(10);
              }}
            >
              <option>All updates</option>
              <option>Added</option>
              <option>Rank dated</option>
            </select>
          </label>
        </div>
        <p className="scroll-hint">Swipe across for all columns. Row labels stay visible.</p>
        <div
          className="insight-table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Community insights table, scroll horizontally for all columns"
        >
          <table className="insight-table">
            <thead>
              <tr>
                <th>Lock</th>
                <th>Current rank</th>
                <th>Added</th>
                <th>Updated</th>
                <th>Rank date</th>
              </tr>
            </thead>
            <tbody>
              {updateRows.slice(0, updatesLimit).map(({ entry }) => (
                <tr key={entry.id}>
                  <th scope="row">
                    <a href={lockLink(entry.id)} target="_blank" rel="noreferrer">
                      {entry.name}
                    </a>
                    {entry.version && <small>{entry.version}</small>}
                  </th>
                  <td>{entry.belt}</td>
                  <td>{formatDate(entry.addedAt)}</td>
                  <td>{formatDate(entry.updatedAt)}</td>
                  <td>{formatDate(entry.rankDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!updateRows.length && <p>No dated catalog entries are available for this selection.</p>}
        {updateRows.length > updatesLimit && (
          <button
            className="secondary-button"
            onClick={() => setUpdatesLimit((value) => value + 20)}
          >
            Show more updates
          </button>
        )}
        <p className="chart-note">
          Catalog updates may include photos or descriptions. A supplied rank date does not provide
          the previous rank or a complete ranking history.
        </p>
      </article>

      <article className="panel insight-panel">
        <div className="panel-title">
          <div>
            <p className="eyebrow">Additional collections</p>
            <h3 id="published-lists" tabIndex={-1}>
              Recorded locks, scorecard, and safe locks
            </h3>
          </div>
        </div>
        <div className="insight-extra-counts">
          {[
            { label: "Recorded", value: recorded?.length },
            { label: "Scorecard locks", value: scorecard },
            { label: "Safe locks owned", value: safeOwn?.length },
            { label: "Safe locks cracked", value: safeCracked?.length },
            { label: "Safe-lock wishlist", value: safeWanted?.length },
          ].map(({ label, value }) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value == null ? "Not loaded" : value}</strong>
            </div>
          ))}
        </div>
        {(!profile.collections ||
          recorded === undefined ||
          safeOwn === undefined ||
          safeCracked === undefined ||
          safeWanted === undefined ||
          scorecard === null) && (
          <p>
            This saved snapshot does not include every additional collection.{" "}
            <button className="secondary-button" onClick={onRefreshProfile}>
              Refresh this profile
            </button>
          </p>
        )}
        {!!(recorded?.length || scorecardIds.length) && (
          <details>
            <summary>View recorded and scorecard locks</summary>
            <ul>
              {[...new Set([...(recorded ?? []), ...scorecardIds])].map((id) => (
                <li key={id}>
                  <a href={lockLink(id)} target="_blank" rel="noreferrer">
                    {catalogById.get(id)?.name ?? id}
                  </a>{" "}
                  · {recorded?.includes(id) ? "Recorded" : ""}
                  {recorded?.includes(id) && scorecardIds.includes(id) ? " · " : ""}
                  {scorecardIds.includes(id) ? "Scorecard" : ""}
                </li>
              ))}
            </ul>
          </details>
        )}
        {safeOwn && safeCracked && safeOwn.length > 0 && (
          <p>
            {safeOwn.filter((id) => safeCracked.includes(id)).length} of {safeOwn.length} owned safe
            locks marked cracked (
            {safeOwn.length
              ? Math.round(
                  (safeOwn.filter((id) => safeCracked.includes(id)).length / safeOwn.length) * 100,
                )
              : 0}
            %).
          </p>
        )}
        {!!safeIds.size && (
          <>
            <p className="scroll-hint">Swipe across for all columns. Row labels stay visible.</p>
            <div
              className="insight-table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Community insights table, scroll horizontally for all columns"
            >
              <table className="insight-table">
                <thead>
                  <tr>
                    <th>Safe lock</th>
                    <th>Tier</th>
                    <th>Owned</th>
                    <th>Cracked</th>
                    <th>Wishlist</th>
                  </tr>
                </thead>
                <tbody>
                  {[...safeIds].map((id) => (
                    <tr key={id}>
                      <th scope="row">{safeCatalog.get(id)?.name ?? id}</th>
                      <td>{safeCatalog.get(id)?.tier || "Not supplied"}</td>
                      <td>{safeOwn?.includes(id) ? "Yes" : "—"}</td>
                      <td>{safeCracked?.includes(id) ? "Yes" : "—"}</td>
                      <td>{safeWanted?.includes(id) ? "Yes" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {!safeIds.size && safeOwn && safeCracked && safeWanted && (
          <p>No safe locks are listed on this profile.</p>
        )}
      </article>
      <p className="insight-source">
        Public data sources:{" "}
        {Object.entries(data.sources).map(([key, url]) => (
          <a key={key} href={url} target="_blank" rel="noreferrer">
            {key}
          </a>
        ))}
      </p>
    </section>
  );
}
