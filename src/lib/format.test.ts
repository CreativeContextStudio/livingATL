import { describe, expect, it } from "vitest";

import { cardSummary, formatRecordingDate, licenseLink, splitSentences } from "./format";

describe("splitSentences", () => {
  it("doesn't break at initials or abbreviations", () => {
    expect(
      splitSentences(
        "Clip 1 of 2 of the December 14, 1978 E. Bernard West interview. L.D. Milton was born c. 1898 in Ga. He moved.",
      ),
    ).toEqual([
      "Clip 1 of 2 of the December 14, 1978 E. Bernard West interview.",
      "L.D. Milton was born c. 1898 in Ga. He moved.",
    ]);
  });

  it("ends a sentence at a closing quote", () => {
    expect(splitSentences("She said 'that was my bag.' Then she left.")).toEqual([
      "She said 'that was my bag.'",
      "Then she left.",
    ]);
  });
});

describe("cardSummary", () => {
  it("skips catalog bookkeeping to the first sentence about the content", () => {
    expect(cardSummary("Clip 1 of 3. About 34 minutes. Dr. Bacote traces Black political organizing.")).toBe(
      "Dr. Bacote traces Black political organizing.",
    );
    expect(
      cardSummary(
        "The December 7, 1978 E. Bernard West interview with Dorothy Bolden, recorded at 52 Farley Street. 67 minutes. Covers: domestic work from age 9.",
      ),
    ).toBe("Domestic work from age 9.");
    expect(cardSummary("A 63-minute oral history recorded October 9, 1978. Annie Alexander covers seven decades.")).toBe(
      "Annie Alexander covers seven decades.",
    );
  });

  it("falls back to the first sentence when every sentence is bookkeeping", () => {
    expect(cardSummary("Clip 2 of 3.")).toBe("Clip 2 of 3.");
  });

  it("cuts long lines at a word boundary", () => {
    const out = cardSummary("Roy Dunn covers his musical education, the rural circuit, open houses, liquor, gambling and numbers running.", 60);
    expect(out.length).toBeLessThanOrEqual(60);
    expect(out).toBe("Roy Dunn covers his musical education, the rural circuit…");
  });

  it("handles empty input", () => {
    expect(cardSummary(null)).toBe("");
    expect(cardSummary("   ")).toBe("");
  });
});

describe("licenseLink", () => {
  it("reads the catalog's rights statement", () => {
    const rights =
      "Copyright is held by WRFG. This work is licensed under a Creative Commons, Attribution-NonCommercial-NoDerivs CC BY-NC-ND license, http://creativecommons.org/licenses/by-nc-nd/4.0/.";
    expect(licenseLink(rights)).toEqual({
      label: "CC BY-NC-ND 4.0",
      href: "https://creativecommons.org/licenses/by-nc-nd/4.0/",
    });
  });
  it("is null without a Creative Commons link", () => {
    expect(licenseLink("All rights reserved")).toBeNull();
    expect(licenseLink(null)).toBeNull();
  });
});

describe("formatRecordingDate", () => {
  it("keeps January 1 in its own year west of UTC", () => {
    const tz = process.env.TZ;
    process.env.TZ = "America/New_York";
    try {
      expect(formatRecordingDate("1977-01-01", "year")).toBe("1977");
      expect(formatRecordingDate("1977-01-01", "estimated")).toBe("c. 1977");
      expect(formatRecordingDate("1977-01-01", "exact")).toBe("January 1, 1977");
    } finally {
      process.env.TZ = tz;
    }
  });
});
