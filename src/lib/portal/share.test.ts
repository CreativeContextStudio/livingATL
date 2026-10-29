import { describe, expect, it } from "vitest";

import { citedOnly, newShareId, shareSecret, signAnswer, verifyAnswer, type SharedCitation } from "./share";

const cite = (index: number): SharedCitation => ({
  index,
  catalogNumber: `MSS ${index}`,
  recordingTitle: "Title",
  intervieweeName: "Ruby Owens",
  audioUrl: "/audio/x.mp3",
  startTime: 10 * index,
  endTime: 10 * index + 30,
  excerpt: "[INTERVIEWEE] words",
  contentNotes: [{ category: "racial_violence", severity: "narrative" }],
});
const Q = "What happened in 1906?";
const A = "Ruby Owens describes it [1][3].";
const C = [cite(1), cite(2), cite(3)];
const KEY = "k".repeat(64);

describe("answer signing", () => {
  it("verifies an untouched answer", () => {
    expect(verifyAnswer(KEY, Q, A, C, signAnswer(KEY, Q, A, C))).toBe(true);
  });
  it("rejects any change to question, answer, citations or key", () => {
    const sig = signAnswer(KEY, Q, A, C);
    expect(verifyAnswer(KEY, Q + "?", A, C, sig)).toBe(false);
    expect(verifyAnswer(KEY, Q, A.replace("describes", "denies"), C, sig)).toBe(false);
    expect(verifyAnswer(KEY, Q, A, [{ ...C[0], excerpt: "forged" }, C[1], C[2]], sig)).toBe(false);
    expect(verifyAnswer(KEY, Q, A, C.slice(0, 2), sig)).toBe(false);
    expect(verifyAnswer("x".repeat(64), Q, A, C, sig)).toBe(false);
  });
  it("derives a separate key from REVALIDATE_SECRET, and is off with neither", () => {
    expect(shareSecret({ PORTAL_SHARE_SECRET: "p" })).toBe("p");
    const derived = shareSecret({ REVALIDATE_SECRET: "r" });
    expect(derived).toMatch(/^[0-9a-f]{64}$/);
    expect(derived).not.toBe("r");
    expect(shareSecret({})).toBeNull();
  });
});

describe("citedOnly / newShareId", () => {
  it("keeps only referenced citations", () => {
    expect(citedOnly(A, C).map((c) => c.index)).toEqual([1, 3]);
    expect(citedOnly("See [2, 3].", C).map((c) => c.index)).toEqual([2, 3]);
  });
  it("makes short URL-safe ids", () => {
    expect(newShareId()).toMatch(/^[A-Za-z0-9_-]{11}$/);
  });
});
