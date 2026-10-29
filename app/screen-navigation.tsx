"use client";

import { useEffect, useRef, useState } from "react";
import { DataTimestamp } from "./activity-status";

export const screens = [
  {
    id: "home",
    label: "Home",
    description: "Introduction, collection summary, and a challenge to pick.",
  },
  {
    id: "analysis",
    label: "Collection analysis",
    description: "Belt ranks, mechanisms, manufacturers, published LPU collections, and insights.",
  },
  {
    id: "community",
    label: "Community & picking",
    description: "Picking progress and comparisons with the LPU community.",
  },
  {
    id: "lpu-insights",
    label: "Coverage & practice",
    description: "Catalog coverage, practice ideas, ranking opinions, and recent locks.",
  },
  {
    id: "explorer",
    label: "Lock explorer",
    description: "Search, filter, and export your owned and wishlist locks.",
  },
  {
    id: "wishlist-owners",
    label: "Wishlist owners",
    description: "Find wishlist owners in ranked profiles, loading 50 more at a time.",
  },
  {
    id: "compare",
    label: "Compare profiles",
    description: "Compare two saved profiles and their reciprocal wishlist matches.",
  },
] as const;
export type ScreenId = (typeof screens)[number]["id"];
export type NavigateScreen = (screen: ScreenId) => void;

export function screenFromHash(hash: string): ScreenId {
  const key = hash.replace(/^#\/?/, "").split(/[/?]/)[0];
  // Legacy Collection summary links now open Home.
  if (key === "overview") return "home";
  if (key === "findings") return "analysis";
  return screens.some((item) => item.id === key) ? (key as ScreenId) : "home";
}

export function screenHref(screen: ScreenId) {
  return `#/${screen}`;
}

export function useScreenNavigation() {
  const [screen, setScreen] = useState<ScreenId>("home");
  const previousScreen = useRef<ScreenId>("home");
  useEffect(() => {
    const update = () => setScreen(screenFromHash(window.location.hash));
    update();
    window.addEventListener("hashchange", update);
    window.addEventListener("popstate", update);
    return () => {
      window.removeEventListener("hashchange", update);
      window.removeEventListener("popstate", update);
    };
  }, []);
  useEffect(() => {
    if (screen === previousScreen.current) return;
    previousScreen.current = screen;
    window.scrollTo({ top: 0, behavior: "instant" });
    document.getElementById("screen-title")?.focus({ preventScroll: true });
  }, [screen]);
  const navigate: NavigateScreen = (next) => {
    const hash = screenHref(next);
    if (window.location.hash !== hash)
      window.history.pushState(
        {},
        "",
        `${window.location.pathname}${window.location.search}${hash}`,
      );
    setScreen(next);
  };
  return { screen, navigate };
}

export function ScreenMenu({
  current,
  onNavigate,
  onOpen,
}: {
  current: ScreenId | null;
  onNavigate: NavigateScreen;
  onOpen?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => setOpen(false), [current]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    window.addEventListener("pointerdown", outside);
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("pointerdown", outside);
      window.removeEventListener("keydown", escape);
    };
  }, [open]);
  return (
    <div className="screen-menu-wrap" ref={root}>
      <button
        className={`screen-menu-button ${open ? "active" : ""}`}
        type="button"
        ref={button}
        aria-expanded={open}
        aria-controls="screen-navigation-menu"
        onClick={() => {
          if (!open) onOpen?.();
          setOpen(!open);
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          aria-hidden="true"
        >
          {open ? <path d="m6 6 12 12M18 6 6 18" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
        </svg>
        Menu
      </button>
      {open && (
        <div className="screen-navigation-menu" id="screen-navigation-menu">
          <nav aria-label="Collection screens">
            {screens.map((item) => (
              <a
                key={item.id}
                href={screenHref(item.id)}
                aria-current={current === item.id ? "page" : undefined}
                onClick={(event) => {
                  if (
                    event.metaKey ||
                    event.ctrlKey ||
                    event.shiftKey ||
                    event.altKey ||
                    event.button !== 0
                  )
                    return;
                  event.preventDefault();
                  setOpen(false);
                  button.current?.focus();
                  onNavigate(item.id);
                }}
              >
                <strong>{item.label}</strong>
              </a>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}

export function ScreenHeading({
  screen,
  onNavigate,
}: {
  screen: ScreenId;
  onNavigate: NavigateScreen;
}) {
  const item = screens.find((item) => item.id === screen)!;
  return (
    <header className="screen-heading">
      <a
        href={screenHref("home")}
        onClick={(event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          onNavigate("home");
        }}
      >
        ← Home
      </a>
      <h1 id="screen-title" tabIndex={-1}>
        {item.label}
      </h1>
      <p>{item.description}</p>
    </header>
  );
}

export function HomeSummary({
  name,
  owned,
  wishlist,
  picked,
  mechanisms,
  refreshedAt,
  loading,
  onNavigate,
}: {
  name: string;
  owned: number;
  wishlist: number;
  picked: number | null;
  mechanisms: number;
  refreshedAt: string;
  loading: boolean;
  onNavigate: NavigateScreen;
}) {
  return (
    <section className="home-summary" aria-labelledby="screen-title">
      <header>
        <p className="eyebrow">Lock Pickers United analytics</p>
        <h1 id="screen-title" tabIndex={-1}>
          {name}’s lock collection
        </h1>
        <p>
          An overview of your LPU collection. Explore locks, track your picking, and plan what comes
          next.
        </p>
      </header>
      <dl className="home-summary-counts">
        {[
          { label: "Owned locks", value: owned },
          { label: "Wishlist locks", value: wishlist },
          { label: "Picked locks", value: picked },
          { label: "Owned mechanisms", value: mechanisms },
        ].map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>
              {loading
                ? "…"
                : item.value === null
                  ? "Not supplied"
                  : item.value.toLocaleString("en-US")}
            </dd>
          </div>
        ))}
      </dl>
      <p className="home-snapshot-date">
        Profile data fetched <DataTimestamp value={refreshedAt} />
      </p>
      <div className="home-summary-actions">
        <button className="primary-button" onClick={() => onNavigate("explorer")}>
          Explore locks
        </button>
        <button className="secondary-button" onClick={() => onNavigate("wishlist-owners")}>
          Wishlist owners
        </button>
      </div>
      <p className="home-menu-hint">
        Open <strong>Menu</strong> for analysis, community comparisons, coverage, and practice
        ideas. Use <strong>Profile</strong> to add, edit, refresh, or compare profiles.
      </p>
    </section>
  );
}
