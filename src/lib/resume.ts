/**
 * Resume position per recording (F-resume) — "Continue from 23:14".
 * Kept in this browser only (localStorage), never sent anywhere. Positions
 * near the start or the end aren't worth offering, so they clear the entry.
 */

const KEY = "livingatl-resume-v1";
/** Don't offer to resume within the first half minute… */
export const MIN_RESUME_SECONDS = 30;
/** …or the last half minute (treated as finished). */
export const END_MARGIN_SECONDS = 30;
const MAX_ENTRIES = 50;

export type ResumeStore = Record<string, { t: number; at: number }>;

/** Pure update: set, clear, and keep only the most recent entries. */
export function updateResumeStore(
  store: ResumeStore,
  catalog: string,
  seconds: number,
  duration: number,
  now: number,
): ResumeStore {
  const next = { ...store };
  const finished = duration > 0 && seconds > duration - END_MARGIN_SECONDS;
  if (seconds < MIN_RESUME_SECONDS || finished || !Number.isFinite(seconds)) {
    delete next[catalog];
    return next;
  }
  next[catalog] = { t: Math.floor(seconds), at: now };
  const keys = Object.keys(next);
  if (keys.length > MAX_ENTRIES) {
    keys
      .sort((a, b) => next[a].at - next[b].at)
      .slice(0, keys.length - MAX_ENTRIES)
      .forEach((k) => delete next[k]);
  }
  return next;
}

function load(): ResumeStore {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/** Saved position for a recording, or null. */
export function readResume(catalog: string): number | null {
  const entry = load()[catalog];
  return entry && Number.isFinite(entry.t) && entry.t >= MIN_RESUME_SECONDS ? entry.t : null;
}

export function writeResume(catalog: string, seconds: number, duration: number): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(updateResumeStore(load(), catalog, seconds, duration, Date.now())));
  } catch {
    /* storage unavailable — resume just isn't offered next time */
  }
}
