import { useEffect, useState } from "react";

export type Mode = "intro" | "trace" | "recall" | "read";

export type Route =
  | { name: "home" }
  | { name: "lesson"; id: number; mode: Mode };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (parts[0] === "lesson" && parts[1]) {
    const id = Number.parseInt(parts[1], 10);
    if (!Number.isNaN(id)) {
      const mode: Mode =
        parts[2] === "trace" || parts[2] === "recall" || parts[2] === "read"
          ? parts[2]
          : "intro";
      return { name: "lesson", id, mode };
    }
  }
  return { name: "home" };
}

export function serializeRoute(r: Route): string {
  if (r.name === "lesson") {
    return `#/lesson/${r.id}${r.mode !== "intro" ? `/${r.mode}` : ""}`;
  }
  return "#/";
}

/**
 * Drives the app from the URL hash, so each view is a real browser-history
 * entry and the back button works (and deep links / refresh survive on the
 * static GitHub Pages host).
 */
export function useHashRoute(): [Route, (r: Route) => void] {
  const [route, setRoute] = useState<Route>(() =>
    parseRoute(window.location.hash),
  );

  useEffect(() => {
    const onChange = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  // Assigning the hash pushes a history entry; the hashchange listener updates
  // state. Navigating to the current location is a no-op.
  const navigate = (r: Route) => {
    const next = serializeRoute(r);
    if (next !== window.location.hash) window.location.hash = next;
  };

  return [route, navigate];
}
