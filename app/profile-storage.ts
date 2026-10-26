// Small settings use a separate namespace so legacy values remain readable.
// Timestamped copies avoid an older localStorage value masking a newer session
// fallback when the persistent store is full or disabled.
const prefix = "lpu-setting-v2:";
function stores(): Storage[] {
  const result: Storage[] = [];
  for (const name of ["localStorage", "sessionStorage"] as const) {
    try {
      result.push(window[name]);
    } catch {
      /* Try the other store. */
    }
  }
  return result;
}
function write(key: string, value: string | null): boolean {
  const available = stores();
  let savedAt = Date.now();
  for (const storage of available) {
    try {
      const previous = JSON.parse(storage.getItem(prefix + key) || "null");
      if (Number.isFinite(previous?.savedAt)) savedAt = Math.max(savedAt, previous.savedAt + 1);
    } catch {
      /* Ignore unreadable settings. */
    }
  }
  const body = JSON.stringify({ value, savedAt });
  let saved = false;
  for (const storage of available) {
    try {
      storage.setItem(prefix + key, body);
      saved = true;
    } catch {
      /* Try the other store. */
    }
  }
  return saved;
}
export const profileStorage = {
  getItem(key: string): string | null {
    let newest: { value: string | null; savedAt: number } | undefined;
    const available = stores();
    for (const storage of available) {
      try {
        const entry = JSON.parse(storage.getItem(prefix + key) || "null");
        if (
          entry &&
          Number.isFinite(entry.savedAt) &&
          (entry.value === null || typeof entry.value === "string") &&
          (!newest || entry.savedAt >= newest.savedAt)
        )
          newest = entry;
      } catch {
        /* Ignore corrupt settings. */
      }
    }
    if (newest) return newest.value;
    for (const storage of available) {
      try {
        const value = storage.getItem(key);
        if (value !== null) return value;
      } catch {
        /* Try the other store. */
      }
    }
    return null;
  },
  setItem(key: string, value: string) {
    if (!write(key, value))
      throw new Error(
        "Your browser could not save profile settings. Free some website storage or allow storage for this site, then try again.",
      );
  },
  removeItem(key: string) {
    // A tombstone also hides a legacy setting without requiring its removal.
    write(key, null);
  },
};
