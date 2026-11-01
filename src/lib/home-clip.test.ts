import { describe, expect, it } from "vitest";

import { HOME_CLIPS, pickHomeClip } from "./home-clip";

describe("home clips", () => {
  it("have unique ids and stay short", () => {
    expect(new Set(HOME_CLIPS.map((c) => c.id)).size).toBe(HOME_CLIPS.length);
    for (const c of HOME_CLIPS) {
      expect(c.end - c.start).toBeGreaterThanOrEqual(8);
      expect(c.end - c.start).toBeLessThanOrEqual(90);
      expect(c.quote.length).toBeLessThanOrEqual(160);
      expect(c.audioUrl).toMatch(/^\/audio\/\w+\.mp3$/);
    }
  });
  it("picks across the whole list", () => {
    expect(pickHomeClip(() => 0)).toBe(HOME_CLIPS[0]);
    expect(pickHomeClip(() => 0.999)).toBe(HOME_CLIPS[HOME_CLIPS.length - 1]);
  });
});
