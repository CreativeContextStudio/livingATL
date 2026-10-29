import { describe, expect, it } from "vitest";

import { contentNotesFor, formatSpokenTime, playableAudioUrl } from "./player";

describe("formatSpokenTime", () => {
  it.each([
    [0, "0 seconds"],
    [1, "1 second"],
    [59.9, "59 seconds"],
    [60, "1 minute"],
    [724, "12 minutes 4 seconds"],
    [3600, "1 hour"],
    [3725, "1 hour 2 minutes 5 seconds"],
    [-5, "0 seconds"],
  ])("%d → %s", (seconds, spoken) => {
    expect(formatSpokenTime(seconds)).toBe(spoken);
  });
});

describe("playableAudioUrl", () => {
  it.each([
    ["https://livingatl.creativecontext.studio/audio/RubyOwens.mp3", "/audio/RubyOwens.mp3"],
    ["https://livingatl.vercel.app/audio/A%20B.mp3", "/audio/A%20B.mp3"],
    ["/audio/RubyOwens.mp3", "/audio/RubyOwens.mp3"],
    ["https://media.example.org/stems/RubyOwens.mp3", "https://media.example.org/stems/RubyOwens.mp3"],
  ])("%s → %s", (stored, playable) => {
    expect(playableAudioUrl(stored)).toBe(playable);
  });

  it("passes null through", () => {
    expect(playableAudioUrl(null)).toBeNull();
  });
});

describe("contentNotesFor", () => {
  const spans = [
    { start: 100, end: 160, category: "racial_violence", severity: "narrative" },
    { start: 150, end: 200, category: "racial_violence", severity: "graphic" },
    { start: 120, end: 130, category: "period_racial_slurs", severity: "historical_quotation" },
    { start: 300, end: 400, category: "kkk_activity", severity: "narrative" },
  ];
  it("keeps overlapping spans, one per category at the strongest severity", () => {
    expect(contentNotesFor(spans, 125, 155)).toEqual([
      { category: "racial_violence", severity: "graphic" },
      { category: "period_racial_slurs", severity: "historical_quotation" },
    ]);
  });
  it("treats ranges as half-open and ignores non-overlapping spans", () => {
    expect(contentNotesFor(spans, 200, 300)).toEqual([]);
    expect(contentNotesFor(spans, 0, 100)).toEqual([]);
    expect(contentNotesFor([], 0, 1000)).toEqual([]);
  });
});
