import { describe, expect, it } from "vitest";

import { matchStorytellers, parseCatalogName, type StorytellerRecordings } from "./storyteller-match";

const S = (name: string, ...ids: string[]): StorytellerRecordings => ({ name, recordingIds: ids });
const ALL = [
  S("McDonald, Hugh A.", "mc1", "mc2"),
  S("Milton, Lorimer D.", "mil1"),
  S("Moore, James A., Jr.", "jm1"),
  S("Moore, Red (James R.)", "red1"),
  S("Keith, L. D. (Lincoln Dewey), 1899-1989; Keith, Laura Jones", "both"),
  S("Doom, Marian S.", "doom1"),
  S("Gray, Effie Dodd", "gray1"),
  S("Borders, William Holmes", "bord1"),
  S("Baynes, E. B.", "bay1"),
  S("Washburn, Nannie L.", "wash1"),
];
const names = (q: string) => matchStorytellers(q, ALL).map((s) => s.name);

describe("parseCatalogName", () => {
  it("reads given names, nicknames and initials", () => {
    expect(parseCatalogName("Moore, Red (James R.)")).toEqual([
      { last: "moore", given: ["red", "james"], initials: "r" },
    ]);
    expect(parseCatalogName("Baynes, E. B.")).toEqual([{ last: "baynes", given: [], initials: "eb" }]);
  });

  it("splits several people and drops life dates and suffixes", () => {
    const people = parseCatalogName("Keith, L. D. (Lincoln Dewey), 1899-1989; Keith, Laura Jones");
    expect(people.map((p) => p.given)).toEqual([["lincoln", "dewey"], ["laura", "jones"]]);
    expect(people[0].initials).toBe("ld");
    expect(parseCatalogName("Moore, James A., Jr.")[0].given).toEqual(["james"]);
  });
});

describe("matchStorytellers", () => {
  it("matches full names, surnames and possessives in any case", () => {
    expect(names("What does Hugh McDonald say about women who died kneeling?")).toEqual(["McDonald, Hugh A."]);
    expect(names("what did mcdonald see in 1917")).toEqual(["McDonald, Hugh A."]);
    expect(names("Nannie Washburn's view of the three governors")).toEqual(["Washburn, Nannie L."]);
  });

  it("matches initials before the surname", () => {
    expect(names("What did white businessmen tell L.D. Milton?")).toEqual(["Milton, Lorimer D."]);
    expect(names("What does E.B. Baynes remember about Leo Frank?")).toEqual(["Baynes, E. B."]);
    expect(names("What did LD Keith do?")).toContain("Keith, L. D. (Lincoln Dewey), 1899-1989; Keith, Laura Jones");
  });

  it("returns every storyteller who shares a surname", () => {
    expect(names("What did Moore say about the railroad?")).toEqual(["Moore, James A., Jr.", "Moore, Red (James R.)"]);
  });

  it("needs a given name or honorific for surnames that are common words", () => {
    expect(names("How did the city's borders change? Was it gray and gloomy?")).toEqual([]);
    expect(names("What does Marian Doom say about burial insurance?")).toEqual(["Doom, Marian S."]);
    expect(names("What did Mrs. Gray say?")).toEqual(["Gray, Effie Dodd"]);
    expect(names("Who did William Holmes Borders work with?")).toEqual(["Borders, William Holmes"]);
  });

  it("matches nothing when no storyteller is named", () => {
    expect(names("What was life like in Clark Howell Homes?")).toEqual([]);
    expect(names("Who was mayor of Atlanta in 1906?")).toEqual([]);
  });
});
