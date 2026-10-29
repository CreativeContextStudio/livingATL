import { describe, expect, it } from "vitest";

import { escapeLikePattern } from "./search-text";

describe("escapeLikePattern", () => {
  it.each([
    ["auburn", "auburn"],
    ["100%", "100\\%"],
    ["a_b", "a\\_b"],
    ["back\\slash", "back\\\\slash"],
    ["%_%", "\\%\\_\\%"],
  ])("%s → %s", (input, escaped) => {
    expect(escapeLikePattern(input)).toBe(escaped);
  });
});
