import { useSyncExternalStore } from "react";

// App-wide preference: colour glyphs by tall/deep/short class, or render plain
// black. Persisted to localStorage; defaults on.

const KEY = "shavian-practice.colour";

function load(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

let on = load();
const subs = new Set<() => void>();

export function setColour(v: boolean) {
  on = v;
  try {
    localStorage.setItem(KEY, v ? "on" : "off");
  } catch {
    /* storage may be unavailable */
  }
  subs.forEach((f) => f());
}

export function useColour(): boolean {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => void subs.delete(f);
    },
    () => on,
  );
}
