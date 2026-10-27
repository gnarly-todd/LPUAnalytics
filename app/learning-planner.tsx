"use client";
import { useMemo, useState } from "react";
import {
  learningWishlist,
  formatInsightDate,
  type InsightProfile,
  type InsightsData,
  type CatalogInsight,
} from "./insights-model";
import { DataTimestamp } from "./activity-status";
import "./learning-planner.css";

export function CatalogDetails({ entry }: { entry?: CatalogInsight }) {
  if (!entry) return null;
  return (
    <details className="catalog-details">
      <summary>Catalog details</summary>
      {!!entry.flags?.length && (
        <p className="catalog-flags">LPU flags: {entry.flags.join(" · ")}</p>
      )}
      <div className="learning-tags">
        {entry.features?.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      {!entry.features?.length && <p>No feature tags supplied by LPU.</p>}
      <p>
        {entry.scorecardCount === undefined
          ? "Scorecard count not supplied"
          : `${entry.scorecardCount.toLocaleString("en-US")} published scorecards`}
      </p>
      <p>Catalog updated {formatInsightDate(entry.updatedAt)}</p>
    </details>
  );
}

export function LearningPlanner({
  profile,
  data,
}: {
  profile: InsightProfile;
  data: InsightsData;
}) {
  const [scope, setScope] = useState("new");
  const [limit, setLimit] = useState(6);
  const all = useMemo(() => learningWishlist(profile, data), [profile, data]);
  const rows =
    scope === "all" ? all : all.filter((row) => row.newMechanisms.length || row.newFeatures.length);
  return (
    <article
      className="panel insight-panel learning-planner"
      aria-labelledby="learning-planner-title"
    >
      <div className="panel-title">
        <div>
          <p className="eyebrow">Plan your next addition</p>
          <h3 id="learning-planner-title" tabIndex={-1}>
            Wishlist learning opportunities
          </h3>
        </div>
        <span className="panel-badge">{rows.length} locks</span>
      </div>
      <p>
        Explore wishlist locks that add mechanisms or catalog features missing from {profile.name}’s
        owned collection. This compares catalog labels, not difficulty or readiness.
      </p>
      <div className="insight-controls">
        <label>
          Show{" "}
          <select
            value={scope}
            onChange={(e) => {
              setScope(e.target.value);
              setLimit(6);
            }}
          >
            <option value="new">New mechanisms or features</option>
            <option value="all">All catalog-matched wishlist locks</option>
          </select>
        </label>
      </div>
      <div className="learning-grid">
        {rows.slice(0, limit).map(({ lock, entry, newMechanisms, newFeatures }) => (
          <section className="learning-card" key={lock.id}>
            <span className="eyebrow">
              {lock.beltLevel ?? lock.belt}
              {lock.belt !== "Unranked" ? " Belt" : ""}
            </span>
            <h4>
              <a
                href={`https://lpubelts.com/locks/${encodeURIComponent(lock.id)}.html`}
                target="_blank"
                rel="noreferrer"
              >
                {lock.name}
              </a>
            </h4>
            {lock.version && <p>{lock.version}</p>}
            {newMechanisms.length > 0 && (
              <>
                <strong>New mechanisms</strong>
                <div className="learning-tags">
                  {newMechanisms.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </>
            )}
            {newFeatures.length > 0 && (
              <>
                <strong>New catalog features</strong>
                <div className="learning-tags">
                  {newFeatures.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </>
            )}
            {!newMechanisms.length && !newFeatures.length && (
              <p>Mechanisms and supplied features already appear in your owned collection.</p>
            )}
            <CatalogDetails entry={entry} />
          </section>
        ))}
      </div>
      {!rows.length && (
        <p role="status">
          {all.length
            ? "No new mechanisms or supplied features found. Choose all wishlist locks to explore further."
            : "No wishlist locks match the current catalog."}
        </p>
      )}
      {rows.length > limit && (
        <button className="secondary-button" onClick={() => setLimit((n) => n + 6)}>
          Show 6 more opportunities
        </button>
      )}
      <p className="insight-source">
        Sorted by new mechanisms, then new feature labels. Missing tags are not evidence that a lock
        lacks a feature. Uses the community snapshot fetched{" "}
        <DataTimestamp value={data.fetchedAt} />.
      </p>
    </article>
  );
}
