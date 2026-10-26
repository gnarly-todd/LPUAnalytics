"use client";

import { useEffect, useState } from "react";
import { ActivityStatus, useActivityTimestamps } from "./activity-status";
import {
  directoryProfileUrl,
  parseProfileDirectory,
  PROFILE_DIRECTORY_URL,
  searchProfileNames,
  type DirectoryProfile,
} from "./profile-name-search";
import "./profile-name-input.css";

let directoryPromise: Promise<DirectoryProfile[]> | undefined;
async function getDirectory() {
  // Only public directory metadata is downloaded. Collection data is fetched
  // later for the exact profile the visitor explicitly selects.
  directoryPromise ??= fetch(PROFILE_DIRECTORY_URL, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(25_000),
  })
    .then(async (response) => {
      if (!response.ok)
        throw new Error(
          "Name search is temporarily unavailable. You can still paste a profile link.",
        );
      return parseProfileDirectory(await response.json());
    })
    .catch((error) => {
      directoryPromise = undefined;
      throw error;
    });
  return directoryPromise;
}

export default function ProfileNameInput({
  value,
  onChange,
  disabled,
  invalid,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  invalid: boolean;
}) {
  const [directory, setDirectory] = useState<DirectoryProfile[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const activity = useActivityTimestamps();
  const [retry, setRetry] = useState(0);
  const isLink = /^https?:\/\//i.test(value.trim());
  const search = value.trim().length >= 2 && !isLink;
  useEffect(() => {
    if (!search || directory) return;
    let cancelled = false;
    activity.start();
    setLoading(true);
    setError("");
    void getDirectory()
      .then((data) => {
        if (!cancelled) setDirectory(data);
      })
      .catch((reason) => {
        if (!cancelled)
          setError(
            reason instanceof Error
              ? reason.message
              : "Name search is unavailable. Paste a profile link instead.",
          );
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          activity.finish();
        }
      });
    return () => {
      activity.finish();
      cancelled = true;
    };
  }, [search, directory, retry]);

  const matches = directory && search ? searchProfileNames(directory, value) : [];
  return (
    <>
      <label htmlFor="profile-url">LPU profile name or link</label>
      <input
        id="profile-url"
        type="text"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        autoFocus
        autoComplete="off"
        placeholder="Sidepicks or https://lpubelts.com/#/profile/…"
        aria-invalid={invalid}
        aria-describedby={invalid ? "profile-error profile-help" : "profile-help"}
      />
      <small id="profile-help">
        Enter at least two characters and select a result, or paste a complete public profile link.
        Name search covers LPU’s public leaderboard, not every account.
      </small>
      {search && loading && !directory && (
        <p className="profile-name-status" role="status">
          Loading profile names…
        </p>
      )}
      {search && <ActivityStatus label="Profile name lookup" timing={activity.timing} />}
      {search && error && (
        <div className="profile-name-status" role="alert">
          <p>{error}</p>
          <button type="button" className="secondary-button" onClick={() => setRetry((n) => n + 1)}>
            Retry name search
          </button>
        </div>
      )}
      {search && directory && !matches.length && (
        <p className="profile-name-status" role="status">
          No matching profile names. Check the spelling or paste the profile link.
        </p>
      )}
      {search && !!matches.length && (
        <div className="profile-name-matches">
          <p className="profile-name-status" role="status">
            {matches.length} matching {matches.length === 1 ? "profile" : "profiles"}
            {matches.length > 20 ? " — showing the first 20; type more to narrow the results" : ""}.
            Select the profile you want.
          </p>
          <ul aria-label="Matching LPU profiles">
            {matches.slice(0, 20).map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(directoryProfileUrl(p))}
                >
                  <strong>{p.displayName}</strong>
                  <small>Profile ID: {p.id}</small>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
