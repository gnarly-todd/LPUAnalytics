import type { Belt, LockRecord } from "../../data";
import { fetchLpuUser, LpuRateLimitError } from "../../lpu-request";
import { profileCollections } from "../../insights-model";

const GITHUB_PAGES_ORIGIN = "https://gnarly-todd.github.io";
const LPU_DATA =
  "https://raw.githubusercontent.com/Lockpickers-United/lpu-belt-explorer/main/apps/web/src/data/data.json";
const PROFILE_ID_PATTERN = /^[A-Za-z0-9_-]{20,128}$/;
const CALLBACK_PATTERN = /^__lpuProfile_[A-Za-z0-9_]{1,96}$/;
const BELTS = new Set<Belt>([
  "White",
  "Yellow",
  "Orange",
  "Green",
  "Blue",
  "Purple",
  "Brown",
  "Red",
  "Black",
  "Unranked",
]);

type LpuEntry = {
  id: string;
  belt: string;
  version?: string;
  lockingMechanisms?: string[];
  makeModels: { make?: string; model?: string }[];
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

let catalogPromise: Promise<LpuEntry[]> | undefined;

// Coalesce simultaneous reads of the same public profile. Cache only successful
// responses briefly; errors/private profiles are never cached as successes.
const publicProfiles = new Map<string, { expires: number; body: string; fetchedAt: number }>();
const pendingProfiles = new Map<string, Promise<Response>>();
async function getPublicProfile(profileId: string): Promise<Response> {
  const cached = publicProfiles.get(profileId);
  if (cached && cached.expires > Date.now())
    return new Response(cached.body, { headers: { "X-LPU-Fetched-At": String(cached.fetchedAt) } });
  let pending = pendingProfiles.get(profileId);
  if (!pending) {
    pending = fetchLpuUser(profileId)
      .then(async (response) => {
        if (response.ok) {
          if (publicProfiles.size >= 200)
            publicProfiles.delete(publicProfiles.keys().next().value!);
          const fetchedAt = Date.now();
          publicProfiles.set(profileId, {
            expires: fetchedAt + 30_000,
            body: await response.clone().text(),
            fetchedAt,
          });
          response = new Response(await response.text(), {
            headers: { "X-LPU-Fetched-At": String(fetchedAt) },
          });
        }
        return response;
      })
      .finally(() => pendingProfiles.delete(profileId));
    pendingProfiles.set(profileId, pending);
  }
  return (await pending).clone();
}

const corsHeaders = (origin: string | null): Record<string, string> =>
  origin === GITHUB_PAGES_ORIGIN
    ? { "Access-Control-Allow-Origin": GITHUB_PAGES_ORIGIN, Vary: "Origin" }
    : {};

const json = (body: Record<string, unknown>, status: number, origin: string | null) =>
  Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...corsHeaders(origin),
      ...(status === 429 && typeof body.retryAt === "number"
        ? { "Retry-After": String(Math.max(1, Math.ceil((body.retryAt - Date.now()) / 1000))) }
        : {}),
    },
  });

const javascript = (body: Record<string, unknown>, callback: string) => {
  const serialized = JSON.stringify(body).replaceAll("<", "\\u003c");
  return new Response(`${callback}(${serialized});`, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/javascript; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
};

async function getCatalog() {
  catalogPromise ??= fetch(LPU_DATA, {
    headers: { "User-Agent": "todd-lock-analytics-profile-loader" },
    signal: AbortSignal.timeout(20_000),
  })
    .then(async (response) => {
      if (!response.ok) throw new Error(`LPU catalog request failed (${response.status}).`);
      return (await response.json()) as LpuEntry[];
    })
    .catch((error) => {
      catalogPromise = undefined;
      throw error;
    });
  return catalogPromise;
}

function collectionStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function lockName(entry: LpuEntry) {
  return entry.makeModels
    .map(({ make, model }) => [make, model].filter(Boolean).join(" ").trim())
    .filter(Boolean)
    .join(" / ");
}

function normalizeBelt(sourceBelt: string): { belt: Belt; beltLevel?: LockRecord["beltLevel"] } {
  if (/^Black [1-5]$/.test(sourceBelt)) {
    return { belt: "Black", beltLevel: sourceBelt as LockRecord["beltLevel"] };
  }
  return { belt: BELTS.has(sourceBelt as Belt) ? (sourceBelt as Belt) : "Unranked" };
}

function resourceLinks(entry: LpuEntry): LockRecord["resourceLinks"] {
  return {
    lpu: `https://lpubelts.com/locks/${entry.id}.html`,
  };
}

function parseProfileUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }

  if (url.protocol !== "https:" || !["lpubelts.com", "www.lpubelts.com"].includes(url.hostname)) {
    return null;
  }

  const match = url.hash.match(/^#\/profile\/([A-Za-z0-9_-]+)(?:\?(.*))?$/);
  if (!match || !PROFILE_ID_PATTERN.test(match[1])) return null;

  const hashParams = new URLSearchParams(match[2] || "");
  return { id: match[1], suppliedName: hashParams.get("name")?.trim() || null };
}

function newYorkTimestamp(fetchedAt = Date.now()) {
  const date = new Date(fetchedAt);
  const day = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(date);
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone: "America/New_York",
  }).format(date);
  return `${day} · ${time}`;
}

export function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  return new Response(null, {
    status: origin === GITHUB_PAGES_ORIGIN ? 204 : 403,
    headers: {
      ...corsHeaders(origin),
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Accept",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function GET(request: Request) {
  const origin = request.headers.get("origin");
  const requestUrl = new URL(request.url);
  const requestedCallback = requestUrl.searchParams.get("callback");
  if (requestedCallback && !CALLBACK_PATTERN.test(requestedCallback)) {
    return json({ message: "Invalid callback." }, 400, origin);
  }
  const reply = (body: Record<string, unknown>, status: number) =>
    requestedCallback ? javascript(body, requestedCallback) : json(body, status, origin);

  if (origin && origin !== GITHUB_PAGES_ORIGIN && origin !== requestUrl.origin) {
    return reply({ message: "Origin not allowed." }, 403);
  }

  const profileUrl = requestUrl.searchParams.get("url");
  const parsed = profileUrl ? parseProfileUrl(profileUrl) : null;
  if (!profileUrl || !parsed) {
    return reply(
      { message: "Enter a full LPU profile link, such as https://lpubelts.com/#/profile/…" },
      400,
    );
  }

  try {
    const [profileResponse, catalog] = await Promise.all([
      getPublicProfile(parsed.id),
      getCatalog(),
    ]);

    if (profileResponse.status === 404) {
      return reply({ message: "That LPU profile does not exist or is not public." }, 404);
    }
    if (!profileResponse.ok)
      throw new Error(`LPU profile request failed (${profileResponse.status}).`);

    const profile = (await profileResponse.json()) as LpuUserResponse;
    if (profile.data?.userId !== parsed.id) {
      throw new Error("LPU profile response did not match the requested user.");
    }
    const collections = profile.data.collections;
    if (
      !Array.isArray(collections?.picked) ||
      !Array.isArray(collections?.own) ||
      !Array.isArray(collections?.wishlist)
    ) {
      throw new Error("LPU profile response is missing collection data.");
    }
    const ownedIds = collectionStrings(collections.own);
    const wishlistIds = collectionStrings(collections.wishlist);
    const ownedSet = new Set(ownedIds);
    const pickedIds = new Set(
      collectionStrings(collections.picked).filter((id) => ownedSet.has(id)),
    );
    const selectedIds = new Set([...ownedIds, ...wishlistIds]);
    const selectedEntries = catalog.filter((entry) => selectedIds.has(entry.id));

    if (selectedEntries.length !== selectedIds.size) {
      return reply(
        { message: "The profile references locks missing from the current LPU catalog." },
        409,
      );
    }

    const locks: LockRecord[] = selectedEntries.map((entry) => {
      const normalized = normalizeBelt(entry.belt);
      return {
        id: entry.id,
        name: lockName(entry),
        ...(entry.version ? { version: entry.version } : {}),
        mechanisms: entry.lockingMechanisms ?? [],
        ...normalized,
        status: ownedSet.has(entry.id) ? "Owned" : "Wishlist",
        picked: pickedIds.has(entry.id),
        resourceLinks: resourceLinks(entry),
      };
    });
    const storedName = profile.data.displayName?.trim();
    const displayName = storedName || parsed.suppliedName || "LPU profile";
    const canonicalUrl = `https://lpubelts.com/#/profile/${parsed.id}?name=${encodeURIComponent(displayName)}`;

    return reply(
      {
        profile: {
          id: parsed.id,
          name: displayName,
          url: canonicalUrl,
          locks,
          collections: profileCollections(collections),
          refreshedAt: newYorkTimestamp(
            Number(profileResponse.headers.get("X-LPU-Fetched-At")) || Date.now(),
          ),
        },
      },
      200,
    );
  } catch (error) {
    if (error instanceof LpuRateLimitError)
      return reply({ message: error.message, retryAt: error.retryAt }, 429);
    console.error("LPU profile loading failed", error);
    return reply(
      {
        message:
          "LPU's public profile service is temporarily unavailable. Please try again shortly.",
      },
      502,
    );
  }
}
