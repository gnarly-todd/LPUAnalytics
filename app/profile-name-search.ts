export type DirectoryProfile = { id: string; displayName: string };
export const PROFILE_DIRECTORY_URL = "https://assets.lpubelts.com/data/leaderboardData.json";

export function parseProfileDirectory(value: unknown): DirectoryProfile[] {
  if (!value || typeof value !== "object" || !Array.isArray((value as { data?: unknown }).data))
    throw new Error("The public profile directory returned an unexpected response.");
  const data = (value as { data: unknown[] }).data;
  const profiles = data.filter((profile): profile is DirectoryProfile => {
    if (!profile || typeof profile !== "object") return false;
    const item = profile as Partial<DirectoryProfile>;
    return (
      typeof item.id === "string" &&
      /^[A-Za-z0-9_-]{20,128}$/.test(item.id) &&
      typeof item.displayName === "string" &&
      !!item.displayName.trim() &&
      !/^(no display name|anonymous|unnamed|undefined|null)$/i.test(item.displayName.trim())
    );
  });
  return [
    ...new Map(
      profiles.map((p) => [p.id, { id: p.id, displayName: p.displayName.trim() }]),
    ).values(),
  ];
}

const normalizeName = (value: string) => value.trim().normalize("NFKC").toLocaleLowerCase("en-US");
export function searchProfileNames(profiles: DirectoryProfile[], name: string) {
  const needle = normalizeName(name);
  if (needle.length < 2 || /^https?:\/\//i.test(needle)) return [];
  const priority = (name: string) => (name === needle ? 0 : name.startsWith(needle) ? 1 : 2);
  return profiles
    .filter((p) => normalizeName(p.displayName).includes(needle))
    .sort(
      (a, b) =>
        priority(normalizeName(a.displayName)) - priority(normalizeName(b.displayName)) ||
        a.displayName.localeCompare(b.displayName) ||
        a.id.localeCompare(b.id),
    );
}

export function directoryProfileUrl(profile: DirectoryProfile) {
  return `https://lpubelts.com/#/profile/${profile.id}?name=${encodeURIComponent(profile.displayName)}`;
}
