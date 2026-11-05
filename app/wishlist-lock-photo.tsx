"use client";

import { useEffect, useState } from "react";
import type { LockRecord } from "./data";
import { photosForLock } from "./lock-photo-sources.mjs";

type LockPhoto = {
  image: string;
  source: string;
  credit: string;
  license: string;
  licenseUrl: string;
};
type PhotoIndex = Record<string, LockPhoto[]>;

const CATALOG_URL =
  "https://raw.githubusercontent.com/Lockpickers-United/lpu-belt-explorer/main/apps/web/src/data/data.json";
let indexPromise: Promise<PhotoIndex> | undefined;
let currentCatalogPromise: Promise<unknown[]> | undefined;

function getPhotoIndex() {
  indexPromise ??= fetch("lock-photos.json", { signal: AbortSignal.timeout(20_000) })
    .then(async (response) => {
      if (!response.ok) throw new Error("Could not load the lock photo index.");
      const index: unknown = await response.json();
      if (!index || typeof index !== "object" || Array.isArray(index))
        throw new Error("The lock photo index was invalid.");
      return index as PhotoIndex;
    })
    .catch((error) => {
      indexPromise = undefined;
      throw error;
    });
  return indexPromise;
}

function getCurrentCatalog() {
  currentCatalogPromise ??= fetch(CATALOG_URL, { signal: AbortSignal.timeout(20_000) })
    .then(async (response) => {
      if (!response.ok) throw new Error("Could not load current lock photo details.");
      const catalog: unknown = await response.json();
      if (!Array.isArray(catalog)) throw new Error("The lock catalog was invalid.");
      return catalog as unknown[];
    })
    .catch((error) => {
      currentCatalogPromise = undefined;
      throw error;
    });
  return currentCatalogPromise;
}

export async function getLockPhotos(id: string): Promise<LockPhoto[]> {
  let indexLoaded = false;
  try {
    const index = await getPhotoIndex();
    indexLoaded = true;
    const photos = index[id];
    if (Array.isArray(photos) && photos.length) return photos;
  } catch {
    // A newer catalog can still provide a photo if the bundled index is unavailable.
  }
  try {
    const catalog = await getCurrentCatalog();
    const entry = catalog.find(
      (value) => value && typeof value === "object" && "id" in value && value.id === id,
    );
    return entry ? (photosForLock(entry) as LockPhoto[]) : [];
  } catch (error) {
    if (!indexLoaded) throw error;
    return [];
  }
}

export function WishlistLockPhoto({ lock }: { lock: LockRecord }) {
  const [open, setOpen] = useState(false);
  const [photos, setPhotos] = useState<LockPhoto[] | null>(null);
  const [failed, setFailed] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open || photos) return;
    let cancelled = false;
    setError(false);
    getLockPhotos(lock.id).then(
      (result) => {
        if (!cancelled) setPhotos(result);
      },
      () => {
        if (!cancelled) setError(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [lock.id, open, photos]);

  const photo = photos?.[failed];
  return (
    <details
      className="wishlist-photo"
      onToggle={(event) => {
        const expanded = event.currentTarget.open;
        if (expanded) setFailed(0);
        setOpen(expanded);
      }}
    >
      <summary aria-label={`Lock photo for ${lock.name}`}>Lock photo</summary>
      {open && (
        <div className="wishlist-photo-content">
          {error ? (
            <p>Couldn’t load photo details. Close and reopen to try again.</p>
          ) : !photos ? (
            <p role="status">Loading photo…</p>
          ) : photo ? (
            <figure>
              <a href={photo.source} target="_blank" rel="noreferrer">
                <img
                  src={photo.image}
                  alt={`${lock.name} lock`}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={() => setFailed((count) => count + 1)}
                />
              </a>
              {(photo.credit || photo.license) && (
                <figcaption>
                  {photo.credit && (
                    <a href={photo.source} target="_blank" rel="noreferrer">
                      {photo.credit}
                    </a>
                  )}
                  {photo.credit && photo.license && " · "}
                  {photo.licenseUrl ? (
                    <a href={photo.licenseUrl} target="_blank" rel="noreferrer">
                      {photo.license}
                    </a>
                  ) : (
                    photo.license
                  )}
                </figcaption>
              )}
            </figure>
          ) : photos.length ? (
            <p>The photo couldn’t be loaded from its host. Close and reopen to try again.</p>
          ) : (
            <p>No LPU-listed photo is available for this lock.</p>
          )}
        </div>
      )}
    </details>
  );
}
