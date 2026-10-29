import { describe, expect, it } from "vitest";

import { safeNextPath } from "./safe-next";

describe("safeNextPath", () => {
  it.each([
    ["/\\evil.com"],
    ["//evil.com"],
    ["https://evil.com"],
    ["/\t/evil.com"],
    ["/\n/evil.com"],
    ["javascript:alert(1)"],
    ["/a/../../..//evil.com"],
    [""],
    [`/${"a".repeat(3000)}`],
  ])("rejects %j", (input) => {
    expect(safeNextPath(input)).toBe("/");
  });

  it.each([undefined, null, 42, {}])("rejects non-string %j", (input) => {
    expect(safeNextPath(input)).toBe("/");
  });

  it.each([
    ["/", "/"],
    ["/browse?theme=labor", "/browse?theme=labor"],
    ["/player/RubyOwens?t=812", "/player/RubyOwens?t=812"],
    ["/about#team", "/about#team"],
    ["/a/./b/../c", "/a/c"],
    ["/%5Cevil.com", "/%5Cevil.com"],
  ])("keeps %j as %j", (input, want) => {
    expect(safeNextPath(input)).toBe(want);
  });

  it("uses the first value of a repeated param", () => {
    expect(safeNextPath(["/map", "//evil.com"])).toBe("/map");
  });

  it("never returns something that leaves the origin", () => {
    const inputs = ["/\\evil.com", "//evil.com", "/a/../../..//evil.com", "/browse", "/\t/x.com"];
    for (const input of inputs) {
      const resolved = new URL(safeNextPath(input), "https://site.test");
      expect(resolved.origin).toBe("https://site.test");
    }
  });
});
