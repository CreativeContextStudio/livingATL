import { describe, expect, it } from "vitest";

import { attributionLine, momentRange, narratorQuote } from "./story-cards";

const segs = [
  { start: 0, end: 5, text: "Tell me about the pharmacy.", speaker_role: "interviewer" as const },
  { start: 5, end: 12, text: "We opened at Auburn and Butler in 1923.", speaker_role: "interviewee" as const },
  { start: 12, end: 18, text: "Folks came from all over.", speaker_role: "interviewee" as const },
];

describe("narratorQuote", () => {
  it("drops interviewer turns", () => {
    expect(narratorQuote(segs, 0, 18)).toBe("We opened at Auburn and Butler in 1923. Folks came from all over.");
  });
  it("falls back to all speakers when the range has no narrator text", () => {
    expect(narratorQuote(segs, 0, 5)).toBe("Tell me about the pharmacy.");
  });
});

describe("momentRange", () => {
  it("spans the first to last referenced segment", () => {
    expect(momentRange(segs, [2, 1])).toEqual({ start: 5, end: 18 });
    expect(momentRange(segs, [9])).toBeNull();
    expect(momentRange(segs, undefined)).toBeNull();
  });
});

describe("attributionLine", () => {
  it("lists unique names", () => {
    expect(attributionLine(["Ruby Owens"])).toBe("Generated from stories by Ruby Owens");
    expect(attributionLine(["A", "B", "A", "C"])).toBe("Generated from stories by A, B and C");
    expect(attributionLine([])).toBe("Generated from stories in the Living Atlanta collection");
  });
});
