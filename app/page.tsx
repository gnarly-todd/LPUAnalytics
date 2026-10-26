"use client";

import WishlistOwnerTable from "./wishlist-owner-table";
import ProfileNameInput from "./profile-name-input";
import {
  HomeSummary,
  ScreenHeading,
  ScreenMenu,
  screenHref,
  useScreenNavigation,
  type ScreenId,
  type NavigateScreen,
} from "./screen-navigation";
import { MechanismCoverageCards } from "./collection-mobile";
import {
  ActivityStatus,
  DataTimestamp,
  useActivityTimestamps,
  type ActivityTiming,
} from "./activity-status";
import {
  InsightsProvider,
  CommunityBenchmarks,
  ExpandedInsights,
  useCommunityInsights,
} from "./community-insights";
import {
  challengeSuggestions,
  formatInsightDate,
  profileCollections,
  profileMetric,
  type ProfileCollections,
} from "./insights-model";
import {
  checkLpuBudget,
  fetchLpuUser,
  LpuRateLimitError,
  recordLpuCooldown,
  retryAtFromHeaders,
  readProfileCache,
  writeProfileCache,
  removeProfileCache,
} from "./lpu-request";
import "./wishlist-owner-table.css";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Belt,
  LockRecord,
  beltColors,
  beltOrder,
  locks as defaultLocks,
  profileSnapshotDate,
  profileCollectionsSnapshot,
  progression,
} from "./data";
const HOSTED_SITE_ORIGIN = "https://todd-lock-analytics.nicelife70117.chatgpt.site";
const SOURCE_URL = "https://lpubelts.com/#/profile/84dULJFIN4bHIC1LxCiuvBCSqT43?name=todd";
const LPU_DATA_URL =
  "https://raw.githubusercontent.com/Lockpickers-United/lpu-belt-explorer/main/apps/web/src/data/data.json";
const LPU_STATS_URL = "https://lpubelts.com/#/stats";
const DEFAULT_PROFILE_ID = "84dULJFIN4bHIC1LxCiuvBCSqT43";
const SAVED_PROFILES_KEY = "todd-lock-analytics-profiles-v1";
const ACTIVE_PROFILE_KEY = "todd-lock-analytics-active-profile-v1";
const DEFAULT_PROFILE_OVERRIDE_KEY = "todd-lock-analytics-default-profile-v1";
const COMPARISON_PROFILE_IDS_KEY = "todd-lock-analytics-comparison-profiles-v1";
const rankedBelts = beltOrder.filter((belt) => belt !== "Unranked");
const displayBelts: Belt[] = ["Unranked", ...rankedBelts];
const beltScore = Object.fromEntries(
  beltOrder.map((belt, index) => [belt, belt === "Unranked" ? -1 : index]),
) as Record<Belt, number>;
const beltLevelScore = (beltLevel?: string) => {
  const level = beltLevel?.match(/(\d+)$/)?.[1];
  return level ? Number(level) : 0;
};
const MULTI_MECHANISM_FILTER = "Multi-mechanism";
const formatNewYorkSnapshot = (date = new Date()) => {
  const snapshotDate = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(date);
  const snapshotTime = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone: "America/New_York",
  }).format(date);

  return `${snapshotDate} · ${snapshotTime}`;
};
const bluePlusBelts = new Set<Belt>(["Blue", "Purple", "Brown", "Red", "Black"]);
const redAndBlackBelts = new Set<Belt>(["Red", "Black"]);
type LoadedProfile = {
  id: string;
  name: string;
  url: string;
  locks: LockRecord[];
  refreshedAt: string;
  collections?: ProfileCollections;
};

type LpuProfileApiResult = {
  profile?: LoadedProfile;
  message?: string;
  retryAt?: number;
};

type LpuUserResponse = {
  data?: {
    userId?: string;
    displayName?: string;
    collections?: {
      own?: unknown;
      wishlist?: unknown;
      picked?: unknown;
      recorded?: unknown;
      recordedLocks?: unknown;
      scorecard?: unknown;
      safelocksOwn?: unknown;
      safelocksCracked?: unknown;
      safelocksWishlist?: unknown;
    };
  };
};

type LpuCatalogEntry = {
  id: string;
  belt: string;
  version?: string;
  lockingMechanisms?: string[];
  makeModels: { make?: string; model?: string }[];
};

type SavedProfile = Pick<LoadedProfile, "id" | "name" | "url"> & { isDefault: boolean };

const defaultProfile: LoadedProfile = {
  id: DEFAULT_PROFILE_ID,
  name: "Todd",
  url: SOURCE_URL,
  locks: defaultLocks,
  collections: profileCollections(profileCollectionsSnapshot),
  refreshedAt: profileSnapshotDate,
};

const builtInDefaultProfile: SavedProfile = {
  id: defaultProfile.id,
  name: defaultProfile.name,
  url: defaultProfile.url,
  isDefault: true,
};

function isStoredProfile(value: unknown): value is Omit<SavedProfile, "isDefault"> {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SavedProfile>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.url === "string" &&
    isValidLpuProfileUrl(candidate.url)
  );
}

const brandFamilies = [
  "ASSA",
  "ABUS",
  "Master Lock",
  "Ruko",
  "Mul-T-Lock",
  "Schlage",
  "GOAL",
  "Burg Wächter",
  "Yale",
  "Lockwood",
  "Chubb",
  "FAB",
];

function deriveProfile(profile: LoadedProfile) {
  const locks = profile.locks;
  const ownedLocks = locks.filter((lock) => lock.status === "Owned");
  const wishlistLocks = locks.filter((lock) => lock.status === "Wishlist");
  const ownedBluePlus = ownedLocks.filter((lock) => bluePlusBelts.has(lock.belt)).length;
  const ownedRedAndBlack = ownedLocks.filter((lock) => redAndBlackBelts.has(lock.belt)).length;
  const ownedMultiMechanism = ownedLocks.filter((lock) => lock.mechanisms.length > 1).length;
  const ownedPicked = ownedLocks.filter((lock) => lock.picked).length;
  const ownedRanked = ownedLocks.filter((lock) => lock.belt !== "Unranked").length;
  const wishlistBluePlus = wishlistLocks.filter((lock) => bluePlusBelts.has(lock.belt)).length;
  const beltCounts = Object.fromEntries(
    beltOrder.map((belt) => [belt, ownedLocks.filter((lock) => lock.belt === belt).length]),
  ) as Record<Belt, number>;
  const mechanismCounts = Object.entries(
    ownedLocks.reduce<Record<string, number>>((counts, lock) => {
      lock.mechanisms.forEach((mechanism) => {
        counts[mechanism] = (counts[mechanism] ?? 0) + 1;
      });
      return counts;
    }, {}),
  )
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  const brandCounts = brandFamilies
    .map((label) => ({
      label,
      value: ownedLocks.filter((lock) => lock.name.includes(label)).length,
    }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  const mechanisms = [...new Set(locks.flatMap((lock) => lock.mechanisms))].sort((a, b) =>
    a.localeCompare(b),
  );
  const ownedRankedScores = ownedLocks
    .filter((lock) => lock.belt !== "Unranked")
    .map((lock) => beltScore[lock.belt])
    .sort((a, b) => a - b);
  const ownedMedian =
    beltOrder[ownedRankedScores[Math.floor(ownedRankedScores.length / 2)]] || "Unranked";
  const percentOfOwned = (value: number) =>
    ownedLocks.length ? ((value / ownedLocks.length) * 100).toFixed(1) : "0.0";
  const pickedByBelt = displayBelts.map((belt) => ({
    belt,
    owned: ownedLocks.filter((lock) => lock.belt === belt).length,
    picked: ownedLocks.filter((lock) => lock.belt === belt && lock.picked).length,
  }));

  return {
    profile,
    locks,
    ownedLocks,
    wishlistLocks,
    ownedBluePlus,
    ownedRedAndBlack,
    ownedMultiMechanism,
    ownedPicked,
    ownedRanked,
    wishlistBluePlus,
    beltCounts,
    mechanismCounts,
    brandCounts,
    mechanisms,
    ownedMedian,
    percentOfOwned,
    pickedByBelt,
  };
}

type ProfileAnalytics = ReturnType<typeof deriveProfile>;
const ProfileContext = createContext<ProfileAnalytics>(deriveProfile(defaultProfile));
const useProfileAnalytics = () => useContext(ProfileContext);

function isValidLpuProfileUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return (
      url.protocol === "https:" &&
      ["lpubelts.com", "www.lpubelts.com"].includes(url.hostname) &&
      /^#\/profile\/[A-Za-z0-9_-]{20,128}(?:\?.*)?$/.test(url.hash)
    );
  } catch {
    return false;
  }
}

function stringIds(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function normalizeBelt(belt: string): { belt: Belt; beltLevel?: LockRecord["beltLevel"] } {
  if (/^Black [1-5]$/.test(belt))
    return { belt: "Black", beltLevel: belt as LockRecord["beltLevel"] };
  return { belt: beltOrder.includes(belt as Belt) ? (belt as Belt) : "Unranked" };
}

async function fetchLpuProfileFromGithubPages(profileUrl: string): Promise<LoadedProfile> {
  const parsed = new URL(profileUrl);
  const match = parsed.hash.match(/^#\/profile\/([A-Za-z0-9_-]{20,128})(?:\?.*)?$/);
  if (!match) throw new Error("Enter a complete public LPU profile link.");
  const profileId = match[1];

  const response = await fetchLpuUser(profileId).catch((error) => {
    if (error instanceof LpuRateLimitError) throw error;
    throw new Error("The profile refresh service could not be reached. Your saved profile has been kept. Please try again shortly.");
  });

  if (response?.status === 404)
    throw new Error("That LPU profile does not exist or is not public.");
  if (!response?.ok) throw new Error("LPU profile data could not be loaded. Please try again.");
  const profile = (await response.json()) as LpuUserResponse;

  if (profile.data?.userId !== profileId)
    throw new Error("LPU profile data did not match the requested profile.");
  const collections = profile.data.collections;
  if (
    !Array.isArray(collections?.own) ||
    !Array.isArray(collections?.wishlist) ||
    !Array.isArray(collections?.picked)
  )
    throw new Error(
      "The LPU API returned incomplete collection data. Your saved snapshot has been kept.",
    );
  const ownedIds = stringIds(collections.own);
  const wishlistIds = stringIds(collections?.wishlist);
  const ownedSet = new Set(ownedIds);
  const pickedIds = new Set(stringIds(collections?.picked).filter((id) => ownedSet.has(id)));
  const selectedIds = new Set([...ownedIds, ...wishlistIds]);
  const catalogResponse = await fetch(LPU_DATA_URL, {
    cache: "force-cache",
    signal: AbortSignal.timeout(20_000),
  });
  if (!catalogResponse.ok)
    throw new Error("The LPU lock catalog could not be loaded. Please try again.");
  const catalog = (await catalogResponse.json()) as LpuCatalogEntry[];
  const selected = catalog.filter((entry) => selectedIds.has(entry.id));
  if (selected.length !== selectedIds.size)
    throw new Error("The profile references locks missing from the LPU catalog.");

  const fallbackName = new URLSearchParams(parsed.hash.split("?")[1] || "").get("name")?.trim();
  return {
    id: profileId,
    name: profile.data.displayName?.trim() || fallbackName || "LPU profile",
    url: `https://lpubelts.com/#/profile/${profileId}`,
    refreshedAt: formatNewYorkSnapshot(new Date(Number(response.headers.get("X-LPU-Fetched-At")) || Date.now())),
    collections: profileCollections(collections),
    locks: selected.map((entry) => ({
      id: entry.id,
      name: entry.makeModels
        .map(({ make, model }) => [make, model].filter(Boolean).join(" ").trim())
        .filter(Boolean)
        .join(" / "),
      ...(entry.version ? { version: entry.version } : {}),
      mechanisms: entry.lockingMechanisms ?? [],
      ...normalizeBelt(entry.belt),
      status: ownedSet.has(entry.id) ? "Owned" : "Wishlist",
      picked: pickedIds.has(entry.id),
      resourceLinks: { lpu: `https://lpubelts.com/locks/${entry.id}.html` },
    })),
  };
}

async function requestLpuProfile(profileUrl: string): Promise<LoadedProfile> {
  checkLpuBudget();
  if (window.location.hostname.endsWith("github.io")) {
    return fetchLpuProfileFromGithubPages(profileUrl);
  }

  const response = await fetch(`/api/lpu-profile?url=${encodeURIComponent(profileUrl)}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(45_000),
  });
  const result = (await response.json().catch(() => null)) as LpuProfileApiResult | null;

  if (response.status === 429 || result?.retryAt) {
    const retryAt = result?.retryAt || retryAtFromHeaders(response.headers);
    recordLpuCooldown(retryAt);
    throw new LpuRateLimitError(retryAt);
  }
  if (!response.ok || !result?.profile) {
    throw new Error(result?.message || "That LPU profile could not be loaded.");
  }
  return result.profile;
}

const pendingProfileLoads = new Map<string, Promise<LoadedProfile>>();
function fetchLpuProfile(profileUrl: string): Promise<LoadedProfile> {
  const key = new URL(profileUrl).hash.split("?")[0];
  let pending = pendingProfileLoads.get(key);
  if (!pending) {
    pending = requestLpuProfile(profileUrl)
      .then((loaded) => {
        writeProfileCache(loaded);
        return loaded;
      })
      .finally(() => pendingProfileLoads.delete(key));
    pendingProfileLoads.set(key, pending);
  }
  return pending;
}

function readCachedProfile(profileId: string) {
  return readProfileCache<LoadedProfile>(profileId);
}

async function loadSavedProfile(saved: SavedProfile) {
  const cached = readCachedProfile(saved.id);
  if (cached) return cached;
  if (saved.id === DEFAULT_PROFILE_ID) return defaultProfile;
  return fetchLpuProfile(saved.url);
}

const iconPaths: Record<string, React.ReactNode> = {
  chart: (
    <>
      <path d="M4 19V9m6 10V5m6 14v-7m4 7H2" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  moon: <path d="M20 15.2A8.5 8.5 0 0 1 8.8 4a8.5 8.5 0 1 0 11.2 11.2Z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  arrow: (
    <>
      <path d="M5 12h14" />
      <path d="m14 7 5 5-5 5" />
    </>
  ),
  external: (
    <>
      <path d="M14 4h6v6" />
      <path d="m10 14 10-10" />
      <path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </>
  ),
  shuffle: (
    <>
      <path d="M3 7h3c5 0 6 10 11 10h4" />
      <path d="m18 14 3 3-3 3" />
      <path d="M3 17h3c1.7 0 2.8-1.1 3.8-2.6M14.2 9.6C15.2 8.1 16.3 7 18 7h3" />
      <path d="m18 4 3 3-3 3" />
    </>
  ),
  compare: (
    <>
      <rect x="3" y="4" width="7" height="16" rx="1" />
      <rect x="14" y="4" width="7" height="16" rx="1" />
      <path d="M10 9h4M10 15h4" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="3" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      <path d="M12 15v2" />
    </>
  ),
  spark: (
    <>
      <path d="m12 3 1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7Z" />
      <path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8Z" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11a8 8 0 1 0-2.3 5.7" />
      <path d="M20 4v7h-7" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  chevron: <path d="m7 10 5 5 5-5" />,
  check: <path d="m5 12 4 4L19 6" />,
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
    </>
  ),
};

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {iconPaths[name]}
    </svg>
  );
}

function BeltPill({
  belt,
  label,
  compact = false,
}: {
  belt: Belt;
  label?: string;
  compact?: boolean;
}) {
  const beltLabel = label ? `${label} Belt` : belt === "Unranked" ? "Unranked" : `${belt} Belt`;

  return (
    <span
      className={`belt-pill ${compact ? "compact" : ""}`}
      style={{ "--belt": beltColors[belt] } as React.CSSProperties}
    >
      <i />
      {beltLabel}
    </span>
  );
}

function SectionHeading({
  eyebrow,
  title,
  copy,
}: {
  eyebrow: string;
  title: string;
  copy: string;
}) {
  return (
    <div className="section-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{copy}</p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  tone,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  tone: string;
  icon: string;
}) {
  return (
    <article className="metric-card" style={{ "--tone": tone } as React.CSSProperties}>
      <div className="metric-icon">
        <Icon name={icon} />
      </div>
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{detail}</span>
    </article>
  );
}

function CollectionSnapshot() {
  const {
    ownedLocks,
    ownedBluePlus,
    ownedRedAndBlack,
    ownedMultiMechanism,
    ownedPicked,
    percentOfOwned,
  } = useProfileAnalytics();
  const rings = [
    {
      label: "Blue Belt & above",
      value: Number(percentOfOwned(ownedBluePlus)),
      color: "#6ee7f2",
      radius: 92,
    },
    {
      label: "Red & Black Belts",
      value: Number(percentOfOwned(ownedRedAndBlack)),
      color: "#e65d72",
      radius: 72,
    },
    {
      label: "Multi-mechanism",
      value: Number(percentOfOwned(ownedMultiMechanism)),
      color: "#a875f2",
      radius: 52,
    },
    { label: "Picked", value: Number(percentOfOwned(ownedPicked)), color: "#66e6a2", radius: 36 },
  ];

  return (
    <article className="profile-snapshot">
      <div className="snapshot-heading">
        <div>
          <p className="eyebrow">Owned collection</p>
          <h2>Depth at a glance</h2>
        </div>
        <span>{ownedLocks.length} owned</span>
      </div>
      <div className="snapshot-visual">
        <svg
          viewBox="0 0 240 240"
          role="img"
          aria-label={`Owned collection: Blue Belt or above ${percentOfOwned(ownedBluePlus)} percent, Red or Black Belt ${percentOfOwned(ownedRedAndBlack)} percent, multiple locking mechanisms ${percentOfOwned(ownedMultiMechanism)} percent, and picked ${percentOfOwned(ownedPicked)} percent`}
        >
          {rings.map((ring) => {
            const circumference = 2 * Math.PI * ring.radius;
            return (
              <g key={ring.label} transform="rotate(-90 120 120)">
                <circle cx="120" cy="120" r={ring.radius} className="snapshot-track" />
                <circle
                  cx="120"
                  cy="120"
                  r={ring.radius}
                  className="snapshot-ring"
                  stroke={ring.color}
                  strokeDasharray={`${(ring.value / 100) * circumference} ${circumference}`}
                />
              </g>
            );
          })}
          <circle cx="120" cy="120" r="26" className="snapshot-center" />
          <text x="120" y="116" textAnchor="middle" className="snapshot-total">
            {ownedLocks.length}
          </text>
          <text x="120" y="134" textAnchor="middle" className="snapshot-caption">
            LOCKS
          </text>
        </svg>
        <div className="snapshot-legend">
          {rings.map((ring) => (
            <div key={ring.label}>
              <i style={{ background: ring.color }} />
              <span>{ring.label}</span>
              <strong>{ring.value}%</strong>
            </div>
          ))}
        </div>
      </div>
      <p className="snapshot-note">
        Percentages use the {ownedLocks.length} owned locks as the base. Picked locks are a subset
        of owned.
      </p>
    </article>
  );
}

function BeltChart({ onSelect }: { onSelect: (belt: Belt) => void }) {
  const { beltCounts, ownedLocks, ownedBluePlus, percentOfOwned } = useProfileAnalytics();
  const ownedBase = Math.max(1, ownedLocks.length);
  let cursor = 0;
  const gradient = displayBelts
    .map((belt) => {
      const start = cursor;
      cursor += (beltCounts[belt] / ownedBase) * 100;
      return `${beltColors[belt]} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`;
    })
    .join(", ");

  return (
    <article className="panel belt-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">LPU belt rankings</p>
          <h3>Belt distribution</h3>
        </div>
        <span className="panel-badge">{ownedLocks.length} owned</span>
      </div>
      <div className="belt-chart-layout">
        <div
          className="donut"
          role="img"
          aria-label="Belt distribution donut chart"
          style={{ background: `conic-gradient(${gradient})` }}
        >
          <div>
            <strong>{percentOfOwned(ownedBluePlus)}%</strong>
            <span>Blue & above</span>
          </div>
        </div>
        <div className="belt-legend">
          {displayBelts.map((belt) => (
            <button
              className={belt === "Unranked" ? "unranked-row" : undefined}
              key={belt}
              onClick={() => onSelect(belt)}
            >
              <i style={{ background: beltColors[belt] }} />
              <span>{belt}</span>
              <strong>{beltCounts[belt]}</strong>
              <small>{((beltCounts[belt] / ownedBase) * 100).toFixed(1)}%</small>
            </button>
          ))}
        </div>
      </div>
      <div className="stacked-belt" aria-hidden="true">
        {displayBelts.map((belt) => (
          <span
            key={belt}
            style={{
              width: `${(beltCounts[belt] / ownedBase) * 100}%`,
              background: beltColors[belt],
            }}
          />
        ))}
      </div>
      <p className="chart-note">
        {percentOfOwned(ownedBluePlus)}% of this owned collection is ranked Blue Belt or above.
      </p>
    </article>
  );
}

function BenchmarkChart() {
  const { profile } = useProfileAnalytics();
  return <CommunityBenchmarks profile={profile} />;
}

function PickingProgressChart() {
  const { pickedByBelt, ownedPicked, ownedLocks, percentOfOwned, profile } = useProfileAnalytics();
  const maxOwned = Math.max(1, ...pickedByBelt.map((item) => item.owned));

  return (
    <article className="panel community-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">Owned versus picked</p>
          <h3>Picking progress by lock rank</h3>
        </div>
        <span className="panel-badge">{ownedPicked} picked</span>
      </div>
      <div className="progress-legend" aria-hidden="true">
        <span>
          <i className="owned" />
          Owned
        </span>
        <span>
          <i className="picked" />
          Picked
        </span>
      </div>
      <div className="pick-progress-chart">
        {pickedByBelt.map((item) => (
          <div className="pick-progress-row" key={item.belt}>
            <span className="rank-text-label">
              <i style={{ background: beltColors[item.belt] }} aria-hidden="true" />
              {item.belt}
            </span>
            <div className="pick-progress-track">
              <i className="owned" style={{ width: `${(item.owned / maxOwned) * 100}%` }} />
              <i className="picked" style={{ width: `${(item.picked / maxOwned) * 100}%` }} />
            </div>
            <strong>
              {item.picked}/{item.owned}
            </strong>
            <small>{item.owned ? Math.round((item.picked / item.owned) * 100) : 0}%</small>
          </div>
        ))}
      </div>
      <p className="chart-note">
        Picked is a subset of owned. {profile.name} has marked {ownedPicked} of {ownedLocks.length}
        owned locks as picked ({percentOfOwned(ownedPicked)}%).
      </p>
    </article>
  );
}

function MemberBeltContext() {
  const { data } = useCommunityInsights();
  const lpuMemberBelts = data.memberBelts;
  return (
    <article className="panel community-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">Community belt records</p>
          <h3>Where Blue Belt sits</h3>
        </div>
        <BeltPill belt="Blue" label="Blue reference" />
      </div>
      <div className="member-context-list">
        {lpuMemberBelts.map((group) => {
          const total = group.counts.reduce((sum, value) => sum + value, 0);
          const bluePlus = group.counts.slice(4).reduce((sum, value) => sum + value, 0);
          return (
            <div className="member-context-row" key={group.platform}>
              <div>
                <strong>{group.platform}</strong>
                <span>{total.toLocaleString()} belt records</span>
              </div>
              <div className="member-stack" aria-label={`${group.platform} belt distribution`}>
                {rankedBelts.map((belt, index) => (
                  <i
                    key={belt}
                    style={{
                      width: `${(group.counts[index] / Math.max(1, total)) * 100}%`,
                      background: beltColors[belt],
                    }}
                    title={`${belt}: ${group.counts[index].toLocaleString()}`}
                  />
                ))}
              </div>
              <p>
                <strong>{((bluePlus / Math.max(1, total)) * 100).toFixed(1)}%</strong> are Blue Belt
                or above
              </p>
            </div>
          );
        })}
      </div>
      <div className="member-belt-key">
        {rankedBelts.map((belt) => (
          <span key={belt}>
            <i style={{ background: beltColors[belt] }} />
            {belt}
          </span>
        ))}
      </div>
      <p className="chart-note">
        Member belt records describe people; collection ranks describe locks. This is community
        context, not a direct measure of collection difficulty. Named belt categories are used;
        separate Dan labels are excluded.
      </p>
    </article>
  );
}

function RankedBars({
  title,
  eyebrow,
  data,
  onSelect,
}: {
  title: string;
  eyebrow: string;
  data: { label: string; value: number }[];
  onSelect?: (value: string) => void;
}) {
  const max = Math.max(1, ...data.map((item) => item.value));
  return (
    <article className="panel ranked-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h3>{title}</h3>
        </div>
        <span className="panel-badge">Owned only</span>
      </div>
      <div className="ranked-bars">
        {data.map((item, index) => (
          <button key={item.label} onClick={() => onSelect?.(item.label)} disabled={!onSelect}>
            <span className="rank-number">{String(index + 1).padStart(2, "0")}</span>
            <span className="rank-label">{item.label}</span>
            <span className="rank-track">
              <i style={{ width: `${(item.value / max) * 100}%` }} />
            </span>
            <strong>{item.value}</strong>
          </button>
        ))}
      </div>
      <p className="chart-note">
        Counts use owned locks only. A lock with multiple mechanism labels can appear in more than
        one row.
      </p>
    </article>
  );
}

function Heatmap() {
  const { mechanismCounts, ownedLocks } = useProfileAnalytics();
  const rows = mechanismCounts.slice(0, 8).map((mechanism) => ({
    mechanism: mechanism.label,
    values: displayBelts.map(
      (belt) =>
        ownedLocks.filter((lock) => lock.belt === belt && lock.mechanisms.includes(mechanism.label))
          .length,
    ),
  }));
  const max = Math.max(1, ...rows.flatMap((row) => row.values));

  return (
    <article className="panel heatmap-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">Collection coverage</p>
          <h3>Locking mechanism × belt rank</h3>
        </div>
        <span className="panel-badge">{ownedLocks.length} owned</span>
      </div>
      <MechanismCoverageCards rows={rows} belts={displayBelts} colors={beltColors} />
      <div
        className="heatmap-scroll"
        tabIndex={0}
        role="region"
        aria-label="Lock mechanism heatmap, scroll horizontally for more columns"
      >
        <div
          className="heatmap"
          style={{ gridTemplateColumns: `145px repeat(${displayBelts.length}, minmax(64px, 1fr))` }}
        >
          <span />
          {displayBelts.map((belt) => (
            <strong key={belt} className="rank-text-label">
              <i style={{ background: beltColors[belt] }} aria-hidden="true" />
              {belt}
            </strong>
          ))}
          {rows.flatMap((row) => [
            <label key={`${row.mechanism}-label`}>{row.mechanism}</label>,
            ...row.values.map((value, index) => (
              <span
                className="heat-cell"
                key={`${row.mechanism}-${displayBelts[index]}`}
                title={`${row.mechanism} · ${displayBelts[index]}: ${value}`}
                style={
                  {
                    "--cell": beltColors[displayBelts[index]],
                    "--opacity": value === 0 ? 0.05 : 0.2 + (value / max) * 0.8,
                  } as React.CSSProperties
                }
              >
                {value || ""}
              </span>
            )),
          ])}
        </div>
      </div>
      <div className="heatmap-insight">
        <Icon name="spark" />
        <p>
          {rows.length ? (
            <>
              <strong>
                {rows[0].mechanism} is the most represented mechanism in this collection.
              </strong>{" "}
            </>
          ) : null}
          Multi-mechanism locks count in each matching group. This view shows up to eight
          mechanisms.
        </p>
      </div>
    </article>
  );
}

function Timeline() {
  const dayDiff = (a: string, b: string) =>
    Math.round(
      (new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86_400_000,
    );
  return (
    <article className="panel timeline-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">Scorecard</p>
          <h3>Belt progression</h3>
        </div>
        <BeltPill belt="Blue" />
      </div>
      <div className="timeline">
        {progression.map((item, index) => (
          <div className="timeline-step" key={item.belt}>
            <div
              className="timeline-node"
              style={{ "--belt": beltColors[item.belt] } as React.CSSProperties}
            >
              <span>
                <Icon name="lock" size={17} />
              </span>
            </div>
            <div className="timeline-copy">
              <strong>{item.belt} Belt</strong>
              <time>
                {new Date(`${item.date}T00:00:00Z`).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  timeZone: "UTC",
                })}
              </time>
              {index > 0 && <small>+{dayDiff(progression[index - 1].date, item.date)} days</small>}
            </div>
          </div>
        ))}
      </div>
      <div className="timeline-summary">
        <strong>259 days</strong>
        <span>Yellow → Blue</span>
        <i />
        <strong>1 day</strong>
        <span>Green → Blue</span>
      </div>
    </article>
  );
}

function InsightCard({
  index,
  title,
  copy,
  stat,
}: {
  index: string;
  title: string;
  copy: string;
  stat: string;
}) {
  return (
    <article className="insight-card">
      <span>{index}</span>
      <div>
        <p className="eyebrow">Key finding</p>
        <h3>{title}</h3>
        <p>{copy}</p>
      </div>
      <strong>{stat}</strong>
    </article>
  );
}

function comparisonStatus(lock?: LockRecord) {
  if (!lock) return { label: "Not tracked", className: "none" };
  if (lock.status === "Wishlist") return { label: "Wishlist", className: "wishlist" };
  if (lock.picked) return { label: "Owned · Picked", className: "picked" };
  return { label: "Owned", className: "owned" };
}

function ComparisonPage({
  onNavigate,
  timing,
  profiles,
  loading,
  error,
  theme,
  onExit,
  onToggleTheme,
}: {
  onNavigate: NavigateScreen;
  timing: ActivityTiming;
  profiles: LoadedProfile[] | null;
  loading: boolean;
  error: string;
  theme: "dark" | "light";
  onExit: () => void;
  onToggleTheme: () => void;
}) {
  if (loading || !profiles || profiles.length !== 2) {
    return (
      <main className={`site-shell theme-${theme}`}>
        <nav className="site-nav comparison-nav app-navigation" aria-label="Comparison navigation">
          <button className="brand brand-button" type="button" onClick={onExit}>
            <span>
              <Icon name="compare" size={17} />
            </span>
            <strong>Profile comparison</strong>
            <small>Collection overview</small>
          </button>
          <div className="nav-actions">
            <ScreenMenu current="compare" onNavigate={onNavigate} />
            <button className="source-link" type="button" onClick={onExit}>
              Back to collection
            </button>
            <button className="icon-button" onClick={onToggleTheme} aria-label="Switch theme">
              <Icon name={theme === "dark" ? "sun" : "moon"} />
            </button>
          </div>
        </nav>
        <section
          className={`comparison-loading ${error ? "comparison-loading-error" : ""}`}
          aria-live="polite"
        >
          <Icon name={error ? "search" : "refresh"} size={28} />
          <h1 id="screen-title" tabIndex={-1}>
            {error ? "Comparison unavailable" : "Loading both profiles…"}
          </h1>
          <p>{error || "Getting the latest saved profile data for this comparison."}</p>
          <ActivityStatus label="Comparison load" timing={timing} />
          {error && (
            <button type="button" onClick={onExit}>
              Return to collection
            </button>
          )}
        </section>
      </main>
    );
  }

  const [leftProfile, rightProfile] = profiles;
  const left = deriveProfile(leftProfile);
  const right = deriveProfile(rightProfile);
  const leftById = new Map(left.locks.map((lock) => [lock.id, lock]));
  const rightById = new Map(right.locks.map((lock) => [lock.id, lock]));
  const comparisonLocks = [...new Set([...leftById.keys(), ...rightById.keys()])]
    .map((id) => ({ id, left: leftById.get(id), right: rightById.get(id) }))
    .sort((a, b) => {
      const aLock = a.left || a.right;
      const bLock = b.left || b.right;
      if (!aLock || !bLock) return 0;
      return (
        beltScore[bLock.belt] - beltScore[aLock.belt] ||
        beltLevelScore(bLock.beltLevel) - beltLevelScore(aLock.beltLevel) ||
        aLock.name.localeCompare(bLock.name)
      );
    });
  const leftOwned = new Set(left.ownedLocks.map((lock) => lock.id));
  const rightOwned = new Set(right.ownedLocks.map((lock) => lock.id));
  const sharedOwned = [...leftOwned].filter((id) => rightOwned.has(id)).length;
  const leftOnly = [...leftOwned].filter((id) => !rightOwned.has(id)).length;
  const rightOnly = [...rightOwned].filter((id) => !leftOwned.has(id)).length;
  const wishlistOverlap = left.wishlistLocks.filter((lock) =>
    right.wishlistLocks.some((candidate) => candidate.id === lock.id),
  ).length;
  const matchWishlistToOwned = (wishlist: LockRecord[], ownerLocksById: Map<string, LockRecord>) =>
    wishlist
      .flatMap((lock) => {
        const ownerLock = ownerLocksById.get(lock.id);
        return ownerLock?.status === "Owned" ? [{ lock, ownerLock }] : [];
      })
      .sort(
        (a, b) =>
          beltScore[b.lock.belt] - beltScore[a.lock.belt] ||
          beltLevelScore(b.lock.beltLevel) - beltLevelScore(a.lock.beltLevel) ||
          a.lock.name.localeCompare(b.lock.name),
      );
  const wishlistMatches = [
    {
      wishlistProfile: left.profile,
      ownerProfile: right.profile,
      matches: matchWishlistToOwned(left.wishlistLocks, rightById),
    },
    {
      wishlistProfile: right.profile,
      ownerProfile: left.profile,
      matches: matchWishlistToOwned(right.wishlistLocks, leftById),
    },
  ];
  const summaryRows = [
    { label: "Owned", left: left.ownedLocks.length, right: right.ownedLocks.length },
    { label: "Picked", left: left.ownedPicked, right: right.ownedPicked },
    { label: "Wishlist", left: left.wishlistLocks.length, right: right.wishlistLocks.length },
    { label: "Blue Belt+ owned", left: left.ownedBluePlus, right: right.ownedBluePlus },
    { label: "Red/Black owned", left: left.ownedRedAndBlack, right: right.ownedRedAndBlack },
    {
      label: "Multi-mechanism owned",
      left: left.ownedMultiMechanism,
      right: right.ownedMultiMechanism,
    },
  ];

  return (
    <main className={`site-shell theme-${theme}`}>
      <nav className="site-nav comparison-nav app-navigation" aria-label="Comparison navigation">
        <button className="brand brand-button" type="button" onClick={onExit}>
          <span>
            <Icon name="compare" size={17} />
          </span>
          <strong>Profile comparison</strong>
          <small>Side by side</small>
        </button>
        <div className="nav-actions">
          <ScreenMenu current="compare" onNavigate={onNavigate} />
          <button className="source-link" type="button" onClick={onExit}>
            Back to collection
          </button>
          <button
            className="icon-button"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          >
            <Icon name={theme === "dark" ? "sun" : "moon"} />
          </button>
        </div>
      </nav>

      <section className="comparison-page" id="top">
        <header className="comparison-hero">
          <p className="eyebrow">Loaded profile comparison</p>
          <h1 id="screen-title" tabIndex={-1}>
            {left.profile.name} <span>vs</span> {right.profile.name}
          </h1>
          <p>Owned locks, picking progress, wishlists, belt coverage, and every tracked lock.</p>
          <ActivityStatus label="Comparison load" timing={timing} />
          <div className="comparison-snapshot-times">
            {[left.profile, right.profile].map((item) => (
              <p key={item.id}>
                {item.name} data fetched <DataTimestamp value={item.refreshedAt} />
              </p>
            ))}
          </div>
          <div className="comparison-source-links">
            {[left.profile, right.profile].map((item) => (
              <a key={item.id} href={item.url} target="_blank" rel="noreferrer">
                {item.name} on LPU <Icon name="external" size={14} />
              </a>
            ))}
          </div>
        </header>

        <section className="comparison-summary" aria-label="Profile totals">
          <div className="comparison-table comparison-summary-table">
            <div className="comparison-table-head">
              <span>Collection metric</span>
              <strong>{left.profile.name}</strong>
              <strong>{right.profile.name}</strong>
            </div>
            {summaryRows.map((row) => (
              <div className="comparison-table-row" key={row.label}>
                <span>{row.label}</span>
                <strong>{row.left.toLocaleString()}</strong>
                <strong>{row.right.toLocaleString()}</strong>
              </div>
            ))}
            <div className="comparison-table-row">
              <span>Median owned rank</span>
              <strong>{left.ownedMedian}</strong>
              <strong>{right.ownedMedian}</strong>
            </div>
          </div>
          <div className="comparison-overlap-grid">
            <article>
              <span>Shared owned</span>
              <strong>{sharedOwned}</strong>
              <small>Locks both profiles own</small>
            </article>
            <article>
              <span>Only {left.profile.name}</span>
              <strong>{leftOnly}</strong>
              <small>Unique owned locks</small>
            </article>
            <article>
              <span>Only {right.profile.name}</span>
              <strong>{rightOnly}</strong>
              <small>Unique owned locks</small>
            </article>
            <article>
              <span>Shared wishlist</span>
              <strong>{wishlistOverlap}</strong>
              <small>Locks both profiles want</small>
            </article>
          </div>
        </section>

        <section className="comparison-section comparison-wishlist-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Wishlist opportunities</p>
              <h2>Locks the other profile owns</h2>
            </div>
            <p>Matches use only the two profiles selected for this comparison.</p>
          </div>
          <div className="comparison-wishlist-grid">
            {wishlistMatches.map(({ wishlistProfile, ownerProfile, matches }) => (
              <article
                className="comparison-wishlist-card"
                key={`${wishlistProfile.id}-${ownerProfile.id}`}
              >
                <header>
                  <div>
                    <span>{wishlistProfile.name}’s wishlist</span>
                    <h3>{ownerProfile.name} owns</h3>
                  </div>
                  <strong>{matches.length.toLocaleString()}</strong>
                </header>
                {matches.length ? (
                  <div className="comparison-wishlist-list">
                    {matches.map(({ lock, ownerLock }) => (
                      <div className="comparison-wishlist-row" key={lock.id}>
                        <div>
                          <strong>{lock.name}</strong>
                          {lock.version && <small>{lock.version}</small>}
                        </div>
                        <BeltPill belt={lock.belt} label={lock.beltLevel} compact />
                        <span
                          className={`comparison-status ${ownerLock.picked ? "picked" : "owned"}`}
                        >
                          {ownerLock.picked ? "Picked" : "Owned"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="comparison-wishlist-empty">
                    {ownerProfile.name} does not own any locks on {wishlistProfile.name}’s wishlist.
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="comparison-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Owned collection distribution</p>
              <h2>Belt rank coverage</h2>
            </div>
            <p>Unranked is shown before White Belt; Black 5 remains the highest rank.</p>
          </div>
          <div className="comparison-table belt-comparison-table">
            <div className="comparison-table-head">
              <span>Belt rank</span>
              <strong>{left.profile.name}</strong>
              <strong>{right.profile.name}</strong>
            </div>
            {displayBelts.map((rank) => (
              <div className="comparison-table-row" key={rank}>
                <span className="comparison-belt-label">
                  <i style={{ background: beltColors[rank] }} /> {rank}
                </span>
                <strong>{left.beltCounts[rank]}</strong>
                <strong>{right.beltCounts[rank]}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="comparison-section comparison-locks-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Complete union</p>
              <h2>Tracked lock by profile</h2>
            </div>
            <p>{comparisonLocks.length.toLocaleString()} distinct locks across both profiles.</p>
          </div>
          <p className="scroll-hint">
            Swipe across to compare both profiles. Lock names stay visible.
          </p>
          <div
            className="comparison-lock-table-shell"
            tabIndex={0}
            role="region"
            aria-label="Compared lock statuses, scroll horizontally for both profiles"
          >
            <table className="comparison-lock-table">
              <thead>
                <tr>
                  <th>Lock</th>
                  <th>Belt</th>
                  <th>{left.profile.name}</th>
                  <th>{right.profile.name}</th>
                </tr>
              </thead>
              <tbody>
                {comparisonLocks.map((row) => {
                  const lock = row.left || row.right;
                  const leftStatus = comparisonStatus(row.left);
                  const rightStatus = comparisonStatus(row.right);
                  if (!lock) return null;
                  return (
                    <tr key={row.id}>
                      <td>
                        <strong>{lock.name}</strong>
                        {lock.version && <small>{lock.version}</small>}
                      </td>
                      <td>
                        <BeltPill belt={lock.belt} label={lock.beltLevel} compact />
                      </td>
                      <td>
                        <span className={`comparison-status ${leftStatus.className}`}>
                          {leftStatus.label}
                        </span>
                      </td>
                      <td>
                        <span className={`comparison-status ${rightStatus.className}`}>
                          {rightStatus.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}

export default function Home() {
  return (
    <InsightsProvider>
      <HomeContent />
    </InsightsProvider>
  );
}

function HomeContent() {
  const { screen, navigate } = useScreenNavigation();
  const { data: communityData } = useCommunityInsights();
  const lpuCatalog = {
    all: communityData.catalog.length,
    ranked: communityData.catalog.filter((entry) => entry.belt !== "Unranked").length,
    unranked: communityData.catalog.filter((entry) => entry.belt === "Unranked").length,
  };
  const LPU_STATS_SNAPSHOT = formatInsightDate(
    communityData.statsUpdatedAt || communityData.fetchedAt,
  );
  const [activeProfile, setActiveProfile] = useState(defaultProfile);
  const analytics = useMemo(() => deriveProfile(activeProfile), [activeProfile]);
  const {
    profile,
    locks,
    ownedLocks,
    wishlistLocks,
    ownedBluePlus,
    ownedRedAndBlack,
    ownedMultiMechanism,
    ownedRanked,
    wishlistBluePlus,
    beltCounts,
    mechanismCounts,
    brandCounts,
    mechanisms,
    ownedMedian,
    percentOfOwned,
  } = analytics;
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"All" | "Owned" | "Wishlist">("Owned");
  const [belt, setBelt] = useState<"All" | Belt>("All");
  const [mechanism, setMechanism] = useState("All");
  const [sort, setSort] = useState("belt-desc");
  const [visible, setVisible] = useState(24);
  const [surprise, setSurprise] = useState<LockRecord | null>(null);
  const [challengeRequest, setChallengeRequest] = useState(0);
  const [copied, setCopied] = useState(false);
  const [refreshState, setRefreshState] = useState<"idle" | "loading" | "queued" | "error">("idle");
  const [refreshMessage, setRefreshMessage] = useState("");
  const [refreshCheckedAt, setRefreshCheckedAt] = useState<number | null>(null);
  const [displayedSnapshotDate, setDisplayedSnapshotDate] = useState(profileSnapshotDate);
  const [savedProfiles, setSavedProfiles] = useState<SavedProfile[]>([builtInDefaultProfile]);
  const [comparisonSelections, setComparisonSelections] = useState<string[]>([]);
  const [comparisonRequested, setComparisonRequested] = useState(false);
  const [comparisonProfiles, setComparisonProfiles] = useState<LoadedProfile[] | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [addProfileOpen, setAddProfileOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<SavedProfile | null>(null);
  const [profileUrlInput, setProfileUrlInput] = useState("");
  const [profileError, setProfileError] = useState("");
  const [loadNotice, setLoadNotice] = useState("");
  const [profileSaveMessage, setProfileSaveMessage] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const profileActivity = useActivityTimestamps();
  const comparisonActivity = useActivityTimestamps();
  const refreshActivity = useActivityTimestamps();
  const setProfileBusy = (value: boolean) => {
    if (value) profileActivity.start();
    else profileActivity.finish();
    setProfileLoading(value);
  };
  const setComparisonBusy = (value: boolean) => {
    if (value) comparisonActivity.start();
    else comparisonActivity.finish();
    setComparisonLoading(value);
  };

  const challengeRef = useRef<HTMLElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const profileModalRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let defaultSaved = builtInDefaultProfile;
    let stored: Omit<SavedProfile, "isDefault">[] = [];
    try {
      const defaultOverride = JSON.parse(
        window.localStorage.getItem(DEFAULT_PROFILE_OVERRIDE_KEY) || "null",
      ) as unknown;
      if (isStoredProfile(defaultOverride)) defaultSaved = { ...defaultOverride, isDefault: true };

      const storedValue = JSON.parse(
        window.localStorage.getItem(SAVED_PROFILES_KEY) || "[]",
      ) as unknown;
      if (Array.isArray(storedValue)) stored = storedValue.filter(isStoredProfile);
    } catch {
      stored = [];
    }
    const profiles = [
      defaultSaved,
      ...stored
        .filter(
          (item, index) =>
            item.id !== defaultSaved.id &&
            stored.findIndex((other) => other.id === item.id) === index,
        )
        .map((item) => ({ ...item, isDefault: false })),
    ];
    setSavedProfiles(profiles);

    let comparisonIds: string[] = [];
    try {
      const storedComparison = JSON.parse(
        window.localStorage.getItem(COMPARISON_PROFILE_IDS_KEY) || "[]",
      ) as unknown;
      if (Array.isArray(storedComparison)) {
        comparisonIds = storedComparison.filter(
          (id): id is string => typeof id === "string" && profiles.some((item) => item.id === id),
        );
      }
    } catch {
      comparisonIds = [];
    }
    comparisonIds = [...new Set(comparisonIds)].slice(0, 2);
    setComparisonSelections(comparisonIds);
    if (
      comparisonIds.length === 2 &&
      (window.location.hash === "#/compare" || !window.location.hash.startsWith("#/"))
    ) {
      navigate("compare");
      const comparisonItems = comparisonIds
        .map((id) => profiles.find((item) => item.id === id))
        .filter((item): item is SavedProfile => Boolean(item));
      if (comparisonItems.length === 2) {
        setComparisonRequested(true);
        setComparisonBusy(true);
        void Promise.all(comparisonItems.map(loadSavedProfile))
          .then((loaded) => setComparisonProfiles(loaded))
          .catch((error: unknown) => {
            setComparisonError(
              error instanceof Error ? error.message : "The selected profiles could not be loaded.",
            );
          })
          .finally(() => setComparisonBusy(false));
      }
    } else if (comparisonIds.length === 1) {
      window.localStorage.removeItem(COMPARISON_PROFILE_IDS_KEY);
      setComparisonSelections([]);
    }

    const storedActiveId = window.localStorage.getItem(ACTIVE_PROFILE_KEY);
    const selected = profiles.find((item) => item.id === storedActiveId) || defaultSaved;
    window.localStorage.setItem(ACTIVE_PROFILE_KEY, selected.id);

    const cached = readCachedProfile(selected.id);
    if (cached) {
      setActiveProfile(cached);
      setDisplayedSnapshotDate(cached.refreshedAt);
      setLoadNotice(
        "Showing your saved profile snapshot. Use Refresh profile to request the latest data.",
      );
      return;
    }
    setActiveProfile(
      selected.id === DEFAULT_PROFILE_ID
        ? defaultProfile
        : { ...selected, locks: [], refreshedAt: "Not loaded" },
    );
    setDisplayedSnapshotDate(
      selected.id === DEFAULT_PROFILE_ID ? profileSnapshotDate : "Not loaded",
    );

    setProfileBusy(true);
    void fetchLpuProfile(selected.url)
      .then((loaded) => {
        setActiveProfile(loaded);
        setDisplayedSnapshotDate(loaded.refreshedAt);
        writeProfileCache(loaded);
      })
      .catch((error: unknown) => {
        setProfileError(
          error instanceof Error ? error.message : "This profile could not be loaded.",
        );
        setLoadNotice(
          error instanceof Error
            ? error.message
            : "This profile could not be loaded. Try Refresh profile again.",
        );
      })
      .finally(() => setProfileBusy(false));
  }, []);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const closeMenu = (event: PointerEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) setProfileMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
        profileMenuRef.current?.querySelector("button")?.focus();
      }
    };
    window.addEventListener("pointerdown", closeMenu);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeMenu);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [profileMenuOpen]);

  useEffect(() => {
    if (!addProfileOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeModal = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAddProfileOpen(false);
      if (event.key !== "Tab") return;
      const controls = Array.from(
        profileModalRef.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]',
        ) ?? [],
      ).filter((element) => element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls.at(-1);
      if (!first || !last) {
        event.preventDefault();
        profileModalRef.current?.focus();
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          !profileModalRef.current?.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !profileModalRef.current?.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", closeModal);
    return () => {
      window.removeEventListener("keydown", closeModal);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
      else profileMenuRef.current?.querySelector("button")?.focus();
    };
  }, [addProfileOpen]);

  useEffect(() => {
    if (!surprise || challengeRequest === 0) return;

    const frame = window.requestAnimationFrame(() => {
      challengeRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      challengeRef.current?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [challengeRequest, surprise]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const refreshResult = url.searchParams.get("refresh");
    if (!refreshResult) return;

    const runId = url.searchParams.get("run_id");
    let pollTimer: number | undefined;
    let cancelled = false;

    if (refreshResult === "queued" && runId && /^\d+$/.test(runId)) {
      refreshActivity.start();
      setRefreshState("queued");
      setRefreshMessage("Profile refresh is running. This page will reload when it finishes.");

      const checkRefresh = async () => {
        try {
          const statusUrl = `${HOSTED_SITE_ORIGIN}/api/refresh-status?run_id=${runId}`;
          const response = await fetch(statusUrl, { headers: { Accept: "application/json" } });
          const result = (await response.json()) as {
            status?: string;
            conclusion?: string | null;
          };

          if (!response.ok) throw new Error("Unable to check refresh status.");
          setRefreshCheckedAt(Date.now());
          if (result.status === "completed") {
            refreshActivity.finish();
            setRefreshState("idle");
            if (result.conclusion === "success") {
              setRefreshMessage("Refresh complete. Reloading the updated collection…");
              setDisplayedSnapshotDate(formatNewYorkSnapshot());
              window.setTimeout(() => window.location.reload(), 1200);
            } else {
              setRefreshState("error");
              setRefreshMessage("The profile refresh workflow did not complete successfully.");
            }
            return;
          }

          if (!cancelled) pollTimer = window.setTimeout(checkRefresh, 3000);
        } catch {
          if (!cancelled) pollTimer = window.setTimeout(checkRefresh, 5000);
        }
      };

      void checkRefresh();
    } else {
      setRefreshState("error");
      setRefreshMessage(
        refreshResult === "forbidden"
          ? "This refresh control is limited to the site owner."
          : "GitHub could not queue the refresh workflow. Try again shortly.",
      );
    }
    url.searchParams.delete("refresh");
    url.searchParams.delete("run_id");
    url.searchParams.delete("destination");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);

    return () => {
      cancelled = true;
      if (pollTimer) window.clearTimeout(pollTimer);
    };
  }, []);

  const filteredLocks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = locks.filter((lock) => {
      const matchesQuery =
        !normalized ||
        `${lock.name} ${lock.version ?? ""} ${lock.mechanisms.join(" ")}`
          .toLowerCase()
          .includes(normalized);
      const matchesBelt = belt === "All" || lock.belt === belt;
      const matchesMechanism =
        mechanism === "All" ||
        (mechanism === MULTI_MECHANISM_FILTER
          ? lock.mechanisms.length > 1
          : lock.mechanisms.includes(mechanism));
      const matchesStatus = status === "All" || lock.status === status;
      return matchesQuery && matchesBelt && matchesMechanism && matchesStatus;
    });
    return [...filtered].sort((a, b) => {
      if (sort === "belt-desc") {
        return (
          beltScore[b.belt] - beltScore[a.belt] ||
          beltLevelScore(b.beltLevel) - beltLevelScore(a.beltLevel) ||
          a.name.localeCompare(b.name)
        );
      }
      if (sort === "belt-asc") {
        return (
          beltScore[a.belt] - beltScore[b.belt] ||
          beltLevelScore(a.beltLevel) - beltLevelScore(b.beltLevel) ||
          a.name.localeCompare(b.name)
        );
      }
      if (sort === "name-desc") return b.name.localeCompare(a.name);
      return a.name.localeCompare(b.name);
    });
  }, [locks, query, status, belt, mechanism, sort]);

  const jumpToExplorer = () => navigate("explorer");
  const selectBelt = (selected: Belt) => {
    setStatus("Owned");
    setBelt(selected);
    setVisible(24);
    requestAnimationFrame(jumpToExplorer);
  };
  const selectMechanism = (selected: string) => {
    setStatus("Owned");
    setMechanism(selected);
    setVisible(24);
    requestAnimationFrame(jumpToExplorer);
  };
  const chooseSurprise = () => {
    const candidates = challengeSuggestions(profile, communityData)
      .slice(0, 6)
      .map((item) => item.lock);
    if (!candidates.length) return;
    setSurprise(candidates[Math.floor(Math.random() * candidates.length)]);
    setChallengeRequest((request) => request + 1);
  };
  const exportCsv = () => {
    const rows = [
      ["Name", "Version", "Collection", "Picked", "Belt", "Mechanisms"],
      ...filteredLocks.map((lock) => [
        lock.name,
        lock.version ?? "",
        lock.status,
        lock.picked ? "Yes" : "No",
        lock.beltLevel ?? lock.belt,
        lock.mechanisms.join(" + "),
      ]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${profile.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-locks-filtered.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const copySummary = async () => {
    const summary = `${profile.name}'s LPU profile tracks ${locks.length} locks: ${ownedLocks.length} owned and ${wishlistLocks.length} wishlist. Of the owned locks, ${ownedBluePlus} are ranked Blue Belt or above (${percentOfOwned(ownedBluePlus)}%), ${ownedRedAndBlack} are ranked Red or Black Belt, and ${ownedMultiMechanism} have multiple locking-mechanism labels. The median owned lock rank is ${ownedMedian} Belt.`;
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };
  const refreshProfile = async () => {
    if (profileLoading || refreshState === "loading" || refreshState === "queued") return;
    refreshActivity.start();
    setProfileMenuOpen(false);
    setRefreshState("loading");
    setRefreshMessage(`Refreshing ${profile.name} from LPU…`);
    try {
      const loaded = await fetchLpuProfile(profile.url);
      writeProfileCache(loaded);
      setActiveProfile(loaded);
      setDisplayedSnapshotDate(loaded.refreshedAt);
      setLoadNotice("");
      setRefreshState("idle");
      setRefreshMessage(`${loaded.name} refreshed successfully.`);
    } catch (error) {
      setRefreshState("error");
      setRefreshMessage(
        error instanceof Error ? error.message : "This profile could not be refreshed.",
      );
    } finally {
      refreshActivity.finish();
    }
  };

  const selectProfile = (selected: SavedProfile) => {
    window.localStorage.removeItem(COMPARISON_PROFILE_IDS_KEY);
    window.localStorage.setItem(ACTIVE_PROFILE_KEY, selected.id);
    setProfileMenuOpen(false);
    window.location.reload();
  };

  const toggleComparisonProfile = (selected: SavedProfile) => {
    const alreadySelected = comparisonSelections.includes(selected.id);
    const nextSelections = alreadySelected
      ? comparisonSelections.filter((id) => id !== selected.id)
      : comparisonSelections.length < 2
        ? [...comparisonSelections, selected.id]
        : comparisonSelections;

    setComparisonSelections(nextSelections);
    if (nextSelections.length === 2) {
      window.localStorage.setItem(COMPARISON_PROFILE_IDS_KEY, JSON.stringify(nextSelections));
      setProfileMenuOpen(false);
      window.location.hash = "#/compare";
      window.location.reload();
    }
  };

  const leaveComparison = (next: ScreenId) => {
    window.localStorage.removeItem(COMPARISON_PROFILE_IDS_KEY);
    setComparisonRequested(false);
    setComparisonProfiles(null);
    setComparisonSelections([]);
    navigate(next);
    window.requestAnimationFrame(() =>
      document.getElementById("screen-title")?.focus({ preventScroll: true }),
    );
  };
  const exitComparison = () => leaveComparison("home");

  const saveAddedProfiles = (profiles: SavedProfile[]) => {
    window.localStorage.setItem(
      SAVED_PROFILES_KEY,
      JSON.stringify(
        profiles.filter((item) => !item.isDefault).map(({ id, name, url }) => ({ id, name, url })),
      ),
    );
  };

  const removeProfile = (removed: SavedProfile) => {
    if (removed.isDefault) return;

    const remaining = savedProfiles.filter((item) => item.id !== removed.id);
    setSavedProfiles(remaining);
    saveAddedProfiles(remaining);
    removeProfileCache(removed.id);
    if (comparisonSelections.includes(removed.id)) {
      window.localStorage.removeItem(COMPARISON_PROFILE_IDS_KEY);
      setComparisonSelections([]);
    }

    if (profile.id === removed.id) {
      const defaultSlot = remaining.find((item) => item.isDefault) || builtInDefaultProfile;
      window.localStorage.setItem(ACTIVE_PROFILE_KEY, defaultSlot.id);
      setProfileMenuOpen(false);
      window.location.reload();
    }
  };

  const openProfileEditor = (selected: SavedProfile | null) => {
    setProfileMenuOpen(false);
    setProfileError("");
    setProfileSaveMessage("");
    setEditingProfile(selected);
    setProfileUrlInput(selected?.url || "");
    setAddProfileOpen(true);
  };

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const addWithoutViewing =
      !editingProfile && submitter instanceof HTMLButtonElement && submitter.value === "add-only";
    setProfileError("");
    setProfileSaveMessage("");
    if (!isValidLpuProfileUrl(profileUrlInput)) {
      setProfileError(
        "Select a matching profile from the name search results, or enter a complete public LPU profile link.",
      );
      return;
    }

    setProfileBusy(true);
    try {
      const loaded = await fetchLpuProfile(profileUrlInput);
      const conflict = savedProfiles.find(
        (item) => item.id === loaded.id && item.id !== editingProfile?.id,
      );
      if (conflict && editingProfile) {
        throw new Error(`${loaded.name} is already in the profile list.`);
      }

      const activeId = window.localStorage.getItem(ACTIVE_PROFILE_KEY);
      let nextProfiles: SavedProfile[];
      let nextActiveId: string;

      if (editingProfile) {
        window.localStorage.removeItem(COMPARISON_PROFILE_IDS_KEY);
        const replacement: SavedProfile = {
          id: loaded.id,
          name: loaded.name,
          url: loaded.url,
          isDefault: editingProfile.isDefault,
        };
        nextProfiles = savedProfiles.map((item) =>
          item.id === editingProfile.id ? replacement : item,
        );
        nextActiveId = activeId === editingProfile.id ? loaded.id : activeId || nextProfiles[0].id;

        if (editingProfile.isDefault) {
          if (loaded.id === DEFAULT_PROFILE_ID) {
            window.localStorage.removeItem(DEFAULT_PROFILE_OVERRIDE_KEY);
          } else {
            window.localStorage.setItem(
              DEFAULT_PROFILE_OVERRIDE_KEY,
              JSON.stringify({ id: loaded.id, name: loaded.name, url: loaded.url }),
            );
          }
        }
        if (editingProfile.id !== loaded.id) {
          removeProfileCache(editingProfile.id);
        }
      } else if (conflict) {
        nextProfiles = savedProfiles.map((item) =>
          item.id === loaded.id ? { ...item, name: loaded.name, url: loaded.url } : item,
        );
        nextActiveId = addWithoutViewing ? profile.id : loaded.id;
      } else {
        nextProfiles = [
          ...savedProfiles,
          { id: loaded.id, name: loaded.name, url: loaded.url, isDefault: false },
        ];
        nextActiveId = addWithoutViewing ? profile.id : loaded.id;
      }

      saveAddedProfiles(nextProfiles);
      window.localStorage.setItem(ACTIVE_PROFILE_KEY, nextActiveId);
      writeProfileCache(loaded);
      if (addWithoutViewing) {
        setSavedProfiles(nextProfiles);
        setEditingProfile(null);
        setProfileUrlInput("");
        setProfileBusy(false);
        setProfileSaveMessage(
          conflict
            ? `${loaded.name} is already saved and has been refreshed. You can add another profile.`
            : `${loaded.name} added. You can add another profile.`,
        );
        window.requestAnimationFrame(() =>
          form.querySelector<HTMLInputElement>("#profile-url")?.focus(),
        );
        return;
      }
      window.location.reload();
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "This profile could not be saved.");
      setProfileBusy(false);
    }
  };

  const refreshInProgress = refreshState === "loading" || refreshState === "queued";
  if (screen === "compare" && comparisonRequested) {
    return (
      <ComparisonPage
        onNavigate={leaveComparison}
        timing={comparisonActivity.timing}
        profiles={comparisonProfiles}
        loading={comparisonLoading}
        error={comparisonError}
        theme={theme}
        onExit={exitComparison}
        onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
      />
    );
  }

  return (
    <ProfileContext.Provider value={analytics}>
      <main className={`site-shell theme-${theme}`}>
        <nav className="site-nav app-navigation" aria-label="Primary navigation">
          <a
            className="brand"
            href={screenHref("home")}
            aria-label={`${profile.name} collection home`}
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              navigate("home");
            }}
          >
            <span>
              <Icon name="lock" size={17} />
            </span>
            <strong>{profile.name} / LPU</strong>
            <small>Collection overview</small>
          </a>
          <div className="nav-actions">
            <ScreenMenu
              current={screen}
              onNavigate={navigate}
              onOpen={() => setProfileMenuOpen(false)}
            />
            <a className="source-link" href={profile.url} target="_blank" rel="noreferrer">
              Source <Icon name="external" size={15} />
            </a>
            <div className="profile-menu-wrap" ref={profileMenuRef}>
              <button
                className={`profile-button ${profileMenuOpen ? "active" : ""} ${refreshInProgress ? "refreshing" : ""}`}
                type="button"
                onClick={() => !refreshInProgress && setProfileMenuOpen((open) => !open)}
                disabled={refreshInProgress}
                aria-expanded={profileMenuOpen}
                aria-haspopup="menu"
                aria-label={
                  refreshInProgress ? "Profile refresh in progress" : `${profile.name} profile menu`
                }
              >
                <Icon name={refreshInProgress ? "refresh" : "user"} size={15} />
                <span>{refreshInProgress ? "Refreshing…" : profile.name}</span>
                {!refreshInProgress && <Icon name="chevron" size={14} />}
              </button>
              {profileMenuOpen && (
                <div className="profile-menu" role="menu">
                  <button
                    type="button"
                    onClick={() => void refreshProfile()}
                    disabled={refreshState === "loading" || refreshState === "queued"}
                    role="menuitem"
                  >
                    <Icon name="refresh" size={16} />
                    <span>
                      <strong>Refresh profile</strong>
                      <small>Load the latest LPU data</small>
                    </span>
                  </button>
                  <button type="button" onClick={() => openProfileEditor(null)} role="menuitem">
                    <Icon name="plus" size={16} />
                    <span>
                      <strong>Add profile</strong>
                      <small>Use a public LPU profile link</small>
                    </span>
                  </button>
                  <div className="profile-menu-label">Profiles on this device</div>
                  {savedProfiles.map((item) => (
                    <div className="saved-profile-row" key={item.id}>
                      <button
                        type="button"
                        className="saved-profile"
                        onClick={() => selectProfile(item)}
                        role="menuitemradio"
                        aria-checked={profile.id === item.id}
                      >
                        <Icon name="user" size={16} />
                        <span>
                          <strong>{item.name}</strong>
                        </span>
                        {profile.id === item.id && <Icon name="check" size={16} />}
                      </button>
                      <div className="profile-row-actions">
                        <button
                          type="button"
                          className="edit-profile"
                          onClick={() => openProfileEditor(item)}
                          role="menuitem"
                          aria-label={`Edit ${item.name} profile`}
                          title={`Edit ${item.name}`}
                        >
                          <Icon name="edit" size={14} />
                        </button>
                        {!item.isDefault && (
                          <button
                            type="button"
                            className="remove-profile"
                            onClick={() => removeProfile(item)}
                            role="menuitem"
                            aria-label={`Remove ${item.name} profile`}
                            title={`Remove ${item.name}`}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="profile-menu-label comparison-picker-label">
                    <span>Compare profiles</span>
                    <small>{comparisonSelections.length} of 2 selected</small>
                  </div>
                  <div className="profile-comparison-picker">
                    {savedProfiles.map((item) => {
                      const selected = comparisonSelections.includes(item.id);
                      const disabled =
                        savedProfiles.length < 2 || (!selected && comparisonSelections.length >= 2);
                      return (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => toggleComparisonProfile(item)}
                          disabled={disabled}
                          role="menuitemcheckbox"
                          aria-checked={selected}
                        >
                          <span className={`comparison-check ${selected ? "selected" : ""}`}>
                            {selected && <Icon name="check" size={13} />}
                          </span>
                          <span>
                            <strong>{item.name}</strong>
                            <small>{selected ? "Selected for comparison" : "Select profile"}</small>
                          </span>
                        </button>
                      );
                    })}
                    {savedProfiles.length < 2 && (
                      <p>Add at least one more profile to start a comparison.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button
              className="icon-button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            >
              <Icon name={theme === "dark" ? "sun" : "moon"} />
            </button>
            <span className="sr-only" role="status" aria-live="polite">
              {refreshMessage}
            </span>
          </div>
        </nav>

        <div className="profile-load-notice" role={refreshState === "error" ? "alert" : "status"}>
          <p>
            {refreshMessage || loadNotice || (
              <>
                Profile data fetched <DataTimestamp value={displayedSnapshotDate} />
              </>
            )}
          </p>
          <button
            className="secondary-button"
            type="button"
            onClick={() => void refreshProfile()}
            disabled={refreshInProgress || profileLoading}
            aria-busy={refreshInProgress}
          >
            {refreshInProgress ? "Refreshing…" : "Refresh profile"}
          </button>
        </div>

        {!addProfileOpen && (
          <div className="profile-activity-summary">
            <ActivityStatus label="Profile load" timing={profileActivity.timing} />
            <ActivityStatus label="Profile refresh" timing={refreshActivity.timing} />
            {refreshCheckedAt !== null && (
              <p className="activity-stamps">
                Refresh status fetched <DataTimestamp value={refreshCheckedAt} />
              </p>
            )}
          </div>
        )}
        {addProfileOpen && (
          <div
            className="profile-modal-backdrop"
            role="presentation"
            onMouseDown={() => setAddProfileOpen(false)}
          >
            <section
              className="profile-modal"
              ref={profileModalRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-labelledby="profile-editor-title"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <button
                className="modal-close"
                type="button"
                onClick={() => setAddProfileOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
              <p className="eyebrow">Profile switcher</p>
              <h2 id="profile-editor-title">
                {editingProfile ? `Edit ${editingProfile.name}` : "Add an LPU profile"}
              </h2>
              <p>
                {editingProfile
                  ? "Replace this saved entry with another public lpubelts.com profile. The page reloads after the change."
                  : "Search by profile name or paste a public profile link. The profile stays saved in this browser."}
              </p>
              <form onSubmit={saveProfile} noValidate>
                <ProfileNameInput
                  value={profileUrlInput}
                  onChange={(value) => {
                    setProfileUrlInput(value);
                    setProfileError("");
                    setProfileSaveMessage("");
                  }}
                  disabled={profileLoading}
                  invalid={Boolean(profileError)}
                />
                <ActivityStatus
                  label={editingProfile ? "Profile edit" : "Profile load"}
                  timing={profileActivity.timing}
                />
                {profileError && (
                  <p className="profile-error" id="profile-error" role="alert">
                    {profileError}
                  </p>
                )}
                {profileSaveMessage && (
                  <p className="profile-save-confirmation" role="status">
                    {profileSaveMessage}
                  </p>
                )}
                <div className="modal-actions profile-save-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setAddProfileOpen(false)}
                  >
                    {profileSaveMessage && !editingProfile ? "Done" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    name="profile-action"
                    value="add-view"
                    className="primary-button"
                    disabled={profileLoading}
                  >
                    {profileLoading
                      ? "Loading profile…"
                      : editingProfile
                        ? "Save profile"
                        : "Add and view profile"}
                  </button>
                  {!editingProfile && (
                    <button
                      type="submit"
                      name="profile-action"
                      value="add-only"
                      className="secondary-button"
                      disabled={profileLoading}
                    >
                      {profileLoading ? "Loading profile…" : "Add profile only"}
                    </button>
                  )}
                </div>
              </form>
            </section>
          </div>
        )}

        {profileLoading && !addProfileOpen && (
          <div className="profile-loading" role="status">
            <Icon name="refresh" /> Loading the selected LPU profile…
          </div>
        )}

        <div className="app-screen" data-screen={screen}>
          {screen === "home" && (
            <HomeSummary
              name={profile.name}
              owned={ownedLocks.length}
              wishlist={wishlistLocks.length}
              picked={profileMetric(profile, "picked")}
              mechanisms={mechanismCounts.length}
              refreshedAt={displayedSnapshotDate}
              loading={profileLoading}
              onNavigate={navigate}
            />
          )}
          {screen !== "home" && <ScreenHeading screen={screen} onNavigate={navigate} />}
          {screen === "compare" && (
            <section className="compare-profile-screen" aria-label="Choose profiles to compare">
              <h2>Select two profiles</h2>
              <p>The comparison opens when you choose the second profile.</p>
              <div className="compare-profile-options">
                {savedProfiles.map((item) => {
                  const selected = comparisonSelections.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={selected}
                      disabled={!selected && comparisonSelections.length >= 2}
                      onClick={() => toggleComparisonProfile(item)}
                    >
                      <span>{item.name}</span>
                      <strong>{selected ? "Selected" : "Select"}</strong>
                    </button>
                  );
                })}
              </div>
              <p role="status">{comparisonSelections.length} of 2 profiles selected.</p>
              {savedProfiles.length < 2 && (
                <button className="secondary-button" onClick={() => openProfileEditor(null)}>
                  Add another profile
                </button>
              )}
              {comparisonSelections.length === 2 && (
                <button
                  className="primary-button"
                  onClick={() => {
                    window.localStorage.setItem(
                      COMPARISON_PROFILE_IDS_KEY,
                      JSON.stringify(comparisonSelections),
                    );
                    window.location.reload();
                  }}
                >
                  Compare selected profiles
                </button>
              )}
            </section>
          )}

          {screen === "home" && (
            <>
              <section
                className="home-collection-summary"
                aria-labelledby="collection-summary-title"
              >
                <div className="hero-copy">
                  <p className="eyebrow">Collection summary</p>
                  <h2 id="collection-summary-title">Your collection at a glance</h2>
                  <p className="hero-lede">
                    Explore your collection’s belt ranks and mechanisms, or draw an owned lock for
                    your next picking challenge.
                  </p>
                  <div className="hero-actions">
                    <button className="primary-button" onClick={jumpToExplorer}>
                      Explore owned locks <Icon name="arrow" />
                    </button>
                    <button
                      className="secondary-button"
                      onClick={chooseSurprise}
                      aria-controls="challenge-result"
                    >
                      <Icon name="shuffle" /> Find a challenge
                    </button>
                  </div>
                  <div className="hero-meta">
                    <div>
                      <span>Owned median</span>
                      <BeltPill belt={ownedMedian} />
                    </div>
                    <div>
                      <span>Wishlist</span>
                      <strong>
                        {wishlistLocks.length} <small>tracked separately</small>
                      </strong>
                    </div>
                  </div>
                </div>
                <CollectionSnapshot />
              </section>

              {surprise && (
                <aside
                  className="surprise-card"
                  id="challenge-result"
                  ref={challengeRef}
                  tabIndex={-1}
                  aria-live="polite"
                >
                  <div className="surprise-icon">
                    <Icon name="spark" />
                  </div>
                  <div>
                    <p className="eyebrow">Owned challenge draw</p>
                    <h3>{surprise.name}</h3>
                    <p>{surprise.version || surprise.mechanisms.join(" + ")}</p>
                  </div>
                  <BeltPill belt={surprise.belt} label={surprise.beltLevel} />
                  <button onClick={chooseSurprise}>
                    <Icon name="shuffle" /> Draw again
                  </button>
                  <button
                    className="surprise-close"
                    onClick={() => setSurprise(null)}
                    aria-label="Close challenge"
                  >
                    ×
                  </button>
                </aside>
              )}

              <section className="section overview-section" id="overview">
                <SectionHeading
                  eyebrow="At a glance"
                  title="The owned collection, quantified"
                  copy={`Core belt-rank and locking-mechanism counts use the ${ownedLocks.length} locks ${profile.name} owns. Wishlist locks remain visible as a separate planning list.`}
                />
                <div className="metric-grid">
                  <MetricCard
                    label="Owned locks"
                    value={String(ownedLocks.length)}
                    detail={`${wishlistLocks.length} more on wishlist`}
                    tone="#6ee7f2"
                    icon="lock"
                  />
                  <MetricCard
                    label="Blue or higher"
                    value={String(ownedBluePlus)}
                    detail={`${percentOfOwned(ownedBluePlus)}% of owned locks`}
                    tone="#6482ff"
                    icon="chart"
                  />
                  <MetricCard
                    label="Red & Black Belts"
                    value={String(ownedRedAndBlack)}
                    detail={`${percentOfOwned(ownedRedAndBlack)}% of owned locks`}
                    tone="#e65d72"
                    icon="spark"
                  />
                  <MetricCard
                    label="Multi-mechanism locks"
                    value={String(ownedMultiMechanism)}
                    detail={`${percentOfOwned(ownedMultiMechanism)}% of owned locks`}
                    tone="#a875f2"
                    icon="shuffle"
                  />
                </div>
                <div className="insight-strip">
                  <div>
                    <span className="insight-number">01</span>
                    <p>
                      <strong>Blue Belt median.</strong> {ownedBluePlus} owned locks are ranked Blue
                      Belt or above, and the median owned rank is {ownedMedian} Belt.
                    </p>
                  </div>
                  <div>
                    <span className="insight-number">02</span>
                    <p>
                      <strong>Broad range of locking mechanisms.</strong> {mechanismCounts.length}{" "}
                      labels cover Pin-tumbler, Disc detainer, Dimple, Slider, Sidepins, Lever, and
                      more.
                    </p>
                  </div>
                  <button onClick={copySummary}>
                    <Icon name="copy" /> {copied ? "Copied" : "Copy summary"}
                  </button>
                </div>
              </section>
            </>
          )}

          {screen === "analysis" && (
            <>
              <section className="section" id="analysis">
                <SectionHeading
                  eyebrow="Owned-only analysis"
                  title="Owned locks by belt rank and locking mechanism"
                  copy="Belt, locking-mechanism, manufacturer, and matrix charts exclude wishlist locks. The collection-status chart remains a profile-level comparison."
                />
                <div className="dashboard-grid">
                  <BeltChart onSelect={selectBelt} />
                  <BenchmarkChart />
                  <RankedBars
                    eyebrow="Lock designs"
                    title="Locking mechanisms"
                    data={mechanismCounts.slice(0, 8)}
                    onSelect={selectMechanism}
                  />
                  <RankedBars
                    eyebrow="Manufacturers"
                    title="Most common manufacturers"
                    data={brandCounts.slice(0, 8)}
                  />
                  <Heatmap />
                  {profile.id === DEFAULT_PROFILE_ID ? (
                    <Timeline />
                  ) : (
                    <article className="panel timeline-panel">
                      <div className="panel-heading">
                        <div>
                          <p className="eyebrow">Picker progression</p>
                          <h3>Belt-award timeline</h3>
                        </div>
                      </div>
                      <p className="profile-data-note">
                        The public LPU profile feed does not expose belt-award dates for this
                        profile.
                      </p>
                    </article>
                  )}
                </div>
              </section>
              <section className="section findings-section" id="findings">
                <SectionHeading
                  eyebrow="Collection insights"
                  title="What the owned data says"
                  copy="The owned collection is concentrated at Blue Belt and above, while the separate wishlist includes even more higher-ranked locks."
                />
                <div className="findings-grid">
                  <InsightCard
                    index="01"
                    title="Higher-ranked owned locks"
                    copy={`${ownedBluePlus} owned locks are ranked Blue Belt or above, including ${beltCounts.Black} Black Belt locks.`}
                    stat={`${ownedBluePlus} locks`}
                  />
                  <InsightCard
                    index="02"
                    title="Pin-tumbler foundation"
                    copy={`${mechanismCounts[0]?.label ?? "No locking mechanism"} is the most common locking-mechanism label in the owned collection.`}
                    stat={`${mechanismCounts[0]?.value ?? 0} locks`}
                  />
                  <InsightCard
                    index="03"
                    title="Higher-ranked wishlist locks"
                    copy={`${wishlistBluePlus} of ${wishlistLocks.length} wishlist locks are ranked Blue Belt or above.`}
                    stat={`${wishlistBluePlus} locks`}
                  />
                </div>
              </section>
            </>
          )}

          {screen === "community" && (
            <>
              <section className="section community-section" id="community">
                <SectionHeading
                  eyebrow="LPU community context"
                  title="Collection depth and picking progress in context"
                  copy={`${profile.name}’s owned and picked counts are compared with the public LPU Stats dashboard. Member belt distributions are shown separately because a picker’s belt and a lock’s rank measure different things.`}
                />
                <div className="community-metrics">
                  <article className="community-metric">
                    <span>Ranked catalog coverage</span>
                    <strong>{((ownedRanked / lpuCatalog.ranked) * 100).toFixed(1)}%</strong>
                    <p>
                      {ownedRanked} owned ranked entries out of {lpuCatalog.ranked} ranked LPU locks
                    </p>
                  </article>
                  <article className="community-metric">
                    <span>Owned versus average</span>
                    <strong>
                      {(
                        ownedLocks.length / Math.max(1, communityData.cohorts.all.own.average)
                      ).toFixed(1)}
                      ×
                    </strong>
                    <p>
                      {ownedLocks.length} owned compared with{" "}
                      {communityData.cohorts.all.own.average.toFixed(1)} among profiles with a
                      nonempty owned list
                    </p>
                  </article>
                  <article className="community-metric">
                    <span>Picked versus average</span>
                    <strong>
                      {(
                        (profileMetric(profile, "picked") ?? 0) /
                        Math.max(1, communityData.cohorts.all.picked.average)
                      ).toFixed(1)}
                      ×
                    </strong>
                    <p>
                      {profileMetric(profile, "picked") ?? 0} picked compared with{" "}
                      {communityData.cohorts.all.picked.average.toFixed(1)} among profiles with a
                      nonempty picked list
                    </p>
                  </article>
                  <article className="community-metric">
                    <span>Wishlist versus average</span>
                    <strong>
                      {(
                        wishlistLocks.length /
                        Math.max(1, communityData.cohorts.all.wishlist.average)
                      ).toFixed(1)}
                      ×
                    </strong>
                    <p>
                      {wishlistLocks.length} wishlist entries compared with{" "}
                      {communityData.cohorts.all.wishlist.average.toFixed(1)} among profiles with a
                      nonempty wishlist
                    </p>
                  </article>
                </div>
                <div className="community-grid">
                  <PickingProgressChart />
                  <MemberBeltContext />
                </div>
                <div className="community-source-note">
                  <p>
                    LPU catalog snapshot: {lpuCatalog.all} total locks, including{" "}
                    {lpuCatalog.ranked} ranked and {lpuCatalog.unranked} unranked. Community figures
                    viewed {LPU_STATS_SNAPSHOT}.
                  </p>
                  <a href={LPU_STATS_URL} target="_blank" rel="noreferrer">
                    Open LPU Stats <Icon name="external" size={15} />
                  </a>
                </div>
              </section>
            </>
          )}

          {screen === "explorer" && (
            <>
              <section className="section explorer-section" id="explorer">
                <div className="explorer-heading">
                  <SectionHeading
                    eyebrow="Interactive explorer"
                    title="Browse owned and wishlist locks"
                    copy="Choose owned, wishlist, or all locks, then filter by belt rank, locking mechanism, or keyword."
                  />
                  <button className="export-button" onClick={exportCsv}>
                    <Icon name="download" /> Export filtered CSV
                  </button>
                </div>

                <div className="collection-tabs" aria-label="Collection status">
                  {(
                    [
                      ["Owned", `Owned ${ownedLocks.length}`],
                      ["Wishlist", `Wishlist ${wishlistLocks.length}`],
                      ["All", `All ${locks.length}`],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      className={status === value ? "active" : ""}
                      aria-pressed={status === value}
                      onClick={() => {
                        setStatus(value);
                        setVisible(24);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="belt-filters" aria-label="Filter by LPU belt rank">
                  <button
                    className={belt === "All" ? "active all-belts" : "all-belts"}
                    aria-pressed={belt === "All"}
                    onClick={() => {
                      setBelt("All");
                      setVisible(24);
                    }}
                  >
                    {status === "All" ? "All locks" : `All ${status.toLowerCase()}`}
                  </button>
                  {displayBelts.map((item) => (
                    <button
                      key={item}
                      className={`belt-filter-button ${belt === item ? "active" : ""}`}
                      style={{ "--belt": beltColors[item] } as React.CSSProperties}
                      aria-pressed={belt === item}
                      onClick={() => {
                        setBelt(item);
                        setVisible(24);
                      }}
                    >
                      <i />
                      {item === "Unranked" ? item : `${item} Belt`}
                    </button>
                  ))}
                </div>

                <div className="filter-bar">
                  <label className="search-field">
                    <Icon name="search" />
                    <input
                      aria-label="Search locks"
                      value={query}
                      onChange={(event) => {
                        setQuery(event.target.value);
                        setVisible(24);
                      }}
                      placeholder="Search model, version, or mechanism…"
                    />
                    <span>{filteredLocks.length} results</span>
                  </label>
                  <label>
                    <span>Belt</span>
                    <select
                      value={belt}
                      onChange={(event) => {
                        setBelt(event.target.value as "All" | Belt);
                        setVisible(24);
                      }}
                    >
                      <option>All</option>
                      {displayBelts.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Mechanism</span>
                    <select
                      value={mechanism}
                      onChange={(event) => {
                        setMechanism(event.target.value);
                        setVisible(24);
                      }}
                    >
                      <option>All</option>
                      <option value={MULTI_MECHANISM_FILTER}>{MULTI_MECHANISM_FILTER}</option>
                      {mechanisms.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Sort</span>
                    <select value={sort} onChange={(event) => setSort(event.target.value)}>
                      <option value="belt-desc">Belt: high to low</option>
                      <option value="belt-asc">Belt: low to high</option>
                      <option value="name">Name: A–Z</option>
                      <option value="name-desc">Name: Z–A</option>
                    </select>
                  </label>
                </div>

                <div className="collection-shell">
                  <div className="collection-summary">
                    <div>
                      <span>{status === "All" ? "Current view" : `${status} collection`}</span>
                      <strong>{filteredLocks.length} matching locks</strong>
                    </div>
                    <p>
                      Cards are ordered by{" "}
                      {sort === "name" || sort === "name-desc"
                        ? `name, ${sort === "name-desc" ? "Z–A" : "A–Z"}`
                        : `belt, ${sort === "belt-desc" ? "highest first" : "lowest first"}`}
                      .
                    </p>
                  </div>
                  <div className="lock-grid">
                    {filteredLocks.slice(0, visible).map((lock, index) => (
                      <article
                        className="lock-card"
                        key={`${lock.name}-${lock.version}-${index}`}
                        style={{ "--belt": beltColors[lock.belt] } as React.CSSProperties}
                      >
                        <span
                          className={`belt-rail ${lock.belt === "Black" ? "black-level" : ""}`}
                          aria-hidden="true"
                        >
                          {lock.belt === "Black" &&
                            Array.from({ length: beltLevelScore(lock.beltLevel) }, (_, stripe) => (
                              <i className="black-level-stripe" key={stripe} />
                            ))}
                        </span>
                        <div className="lock-card-topline">
                          <span className="lock-index">{String(index + 1).padStart(3, "0")}</span>
                          <div className="lock-classification">
                            <span className={`collection-badge ${lock.status.toLowerCase()}`}>
                              {lock.status}
                            </span>
                            {lock.picked && <span className="picked-badge">Picked</span>}
                          </div>
                        </div>
                        <div className="lock-name">
                          <h3>{lock.name}</h3>
                          {lock.version && <p>{lock.version}</p>}
                        </div>
                        <div className="mechanism-tags">
                          {lock.mechanisms.map((item) => (
                            <button key={item} onClick={() => selectMechanism(item)}>
                              {item}
                            </button>
                          ))}
                        </div>
                        <div
                          className="lock-resource-links"
                          aria-label={`LPU reference for ${lock.name}`}
                        >
                          <a
                            href={
                              lock.resourceLinks?.lpu ||
                              `https://lpubelts.com/locks/${lock.id}.html`
                            }
                            target="_blank"
                            rel="noreferrer"
                          >
                            LPU Belts <Icon name="external" size={12} />
                          </a>
                        </div>
                        <div className="lock-card-footer">
                          <span>Belt rank</span>
                          <BeltPill belt={lock.belt} label={lock.beltLevel} compact />
                        </div>
                      </article>
                    ))}
                    {filteredLocks.length === 0 && (
                      <div className="empty-state">
                        <Icon name="search" size={28} />
                        <h3>No locks match those filters</h3>
                        <p>Try a broader keyword or reset one of the collection views.</p>
                        <button
                          onClick={() => {
                            setQuery("");
                            setStatus("Owned");
                            setBelt("All");
                            setMechanism("All");
                          }}
                        >
                          Reset filters
                        </button>
                      </div>
                    )}
                  </div>
                  {visible < filteredLocks.length && (
                    <button className="load-more" onClick={() => setVisible((count) => count + 24)}>
                      Show 24 more <span>{filteredLocks.length - visible} remaining</span>
                    </button>
                  )}
                </div>
              </section>
            </>
          )}

          {screen === "lpu-insights" && (
            <ExpandedInsights profile={profile} onRefreshProfile={() => void refreshProfile()} />
          )}

          {screen === "wishlist-owners" && (
            <WishlistOwnerTable
              activeProfile={profile}
              loading={profileLoading}
              paused={addProfileOpen || profileMenuOpen || refreshInProgress}
            />
          )}
        </div>

        <footer>
          <div className="footer-brand">
            <span>
              <Icon name="lock" />
            </span>
            <div>
              <strong>{profile.name}’s Lock Collection</strong>
              <small>Independent visual analysis</small>
            </div>
          </div>
          <p>
            Data reflects the public LPU profile snapshot refreshed {displayedSnapshotDate}.
            Analysis uses owned locks unless labeled otherwise; wishlist entries remain separate in
            the explorer.
          </p>
          <a href={profile.url} target="_blank" rel="noreferrer">
            Open original profile <Icon name="external" size={15} />
          </a>
        </footer>
      </main>
    </ProfileContext.Provider>
  );
}
