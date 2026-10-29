import { describe, expect, it } from "vitest";

import { formatSpokenTime, playableAudioUrl } from "./player";

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
