"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * "Follow along" preference (F-resume): whether the transcript scrolls with
 * the playhead. On by default; remembered in this browser. A module-level
 * fallback keeps the toggle working when storage is unavailable.
 */
const KEY = "livingatl-follow-along";
const listeners = new Set<() => void>();
let memory = true;

function read(): boolean {
  try {
    const v = localStorage.getItem(KEY);
    return v === null ? memory : v !== "off";
  } catch {
    return memory;
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useFollowAlong(): [boolean, (on: boolean) => void] {
  const follow = useSyncExternalStore(subscribe, read, () => true);
  const set = useCallback((on: boolean) => {
    memory = on;
    try {
      localStorage.setItem(KEY, on ? "on" : "off");
    } catch {
      /* in-memory only */
    }
    listeners.forEach((l) => l());
  }, []);
  return [follow, set];
}
