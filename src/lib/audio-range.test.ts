import { describe, expect, it } from "vitest";

import { MAX_AUDIO_CHUNK, cappedRange } from "./audio-range";

describe("cappedRange", () => {
  it("caps open-ended and large ranges, keeps small ones", () => {
    expect(cappedRange("bytes=0-")).toBe(`bytes=0-${MAX_AUDIO_CHUNK - 1}`);
    expect(cappedRange("bytes=1000-")).toBe(`bytes=1000-${1000 + MAX_AUDIO_CHUNK - 1}`);
    expect(cappedRange("bytes=0-1")).toBe("bytes=0-1");
    expect(cappedRange("bytes=5-99999999")).toBe(`bytes=5-${5 + MAX_AUDIO_CHUNK - 1}`);
  });
  it("passes suffix/multi ranges through and handles no header", () => {
    expect(cappedRange("bytes=-500")).toBe("bytes=-500");
    expect(cappedRange("bytes=0-1,5-9")).toBe("bytes=0-1,5-9");
    expect(cappedRange(null)).toBeNull();
  });
});
