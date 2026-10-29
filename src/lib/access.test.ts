import { describe, expect, it } from "vitest";

import {
  GATE_COOKIE_MAX_AGE_S,
  canViewArchive,
  resolveAccess,
  secretsEqual,
  signGateCookie,
  verifyGateCookie,
} from "./access";

const TOKEN = "a".repeat(64);
const COOKIE = signGateCookie(TOKEN);

describe("resolveAccess", () => {
  // The four env combinations the proxy, routes, and pages must agree on.
  it.each([
    // gate on, launch true — today's prod: the gate decides, flag ignored
    { env: { SITE_GATE_TOKEN: TOKEN, NEXT_PUBLIC_LAUNCH_ENABLED: "true" }, cookie: undefined, want: "gate-required" },
    { env: { SITE_GATE_TOKEN: TOKEN, NEXT_PUBLIC_LAUNCH_ENABLED: "true" }, cookie: COOKIE, want: "entered" },
    // gate on, launch false — an entered visitor must not be locked out
    { env: { SITE_GATE_TOKEN: TOKEN, NEXT_PUBLIC_LAUNCH_ENABLED: "false" }, cookie: undefined, want: "gate-required" },
    { env: { SITE_GATE_TOKEN: TOKEN, NEXT_PUBLIC_LAUNCH_ENABLED: "false" }, cookie: COOKIE, want: "entered" },
    // gate off, launch true — public
    { env: { NEXT_PUBLIC_LAUNCH_ENABLED: "true" }, cookie: undefined, want: "public" },
    // gate off, launch false/unset — invite-only preview; a stale cookie grants nothing
    { env: { NEXT_PUBLIC_LAUNCH_ENABLED: "false" }, cookie: COOKIE, want: "preview" },
    { env: {}, cookie: undefined, want: "preview" },
  ])("$env → $want", ({ env, cookie, want }) => {
    expect(resolveAccess(cookie, env)).toBe(want);
  });

  it("rejects the raw token (old cookie format), tampered, truncated, or empty cookies", () => {
    const env = { SITE_GATE_TOKEN: TOKEN, NEXT_PUBLIC_LAUNCH_ENABLED: "true" };
    const [v, exp, mac] = COOKIE.split(".");
    const tampered = [
      TOKEN,
      "",
      COOKIE.slice(0, -1),
      `${v}.${Number(exp) + 3600}.${mac}`, // extended expiry, old MAC
      `${v}.${exp}.${"A".repeat(43)}`,
      signGateCookie("b".repeat(64)), // signed with a different token
    ];
    for (const cookie of tampered) expect(resolveAccess(cookie, env)).toBe("gate-required");
  });

  it("treats an empty SITE_GATE_TOKEN as no gate", () => {
    expect(resolveAccess(undefined, { SITE_GATE_TOKEN: "", NEXT_PUBLIC_LAUNCH_ENABLED: "true" })).toBe("public");
  });

  it("only treats launch flag literal 'true' as launched", () => {
    for (const v of ["TRUE", "1", "yes", " true"]) {
      expect(resolveAccess(undefined, { NEXT_PUBLIC_LAUNCH_ENABLED: v })).toBe("preview");
    }
  });
});

describe("gate cookie signing", () => {
  it("round-trips and carries no part of the token", () => {
    expect(verifyGateCookie(COOKIE, TOKEN)).toBe(true);
    expect(COOKIE).toMatch(/^v1\.\d+\.[A-Za-z0-9_-]{43}$/);
    expect(COOKIE.includes(TOKEN.slice(0, 8))).toBe(false);
  });

  it("expires after the max age", () => {
    const issued = Date.UTC(2026, 0, 1);
    const cookie = signGateCookie(TOKEN, issued);
    expect(verifyGateCookie(cookie, TOKEN, issued + (GATE_COOKIE_MAX_AGE_S - 1) * 1000)).toBe(true);
    expect(verifyGateCookie(cookie, TOKEN, issued + GATE_COOKIE_MAX_AGE_S * 1000)).toBe(false);
  });

  it("is invalidated by rotating the token", () => {
    expect(verifyGateCookie(COOKIE, "c".repeat(64))).toBe(false);
  });
});

describe("secretsEqual", () => {
  it("compares values, including different lengths, without throwing", () => {
    expect(secretsEqual("hunter2", "hunter2")).toBe(true);
    expect(secretsEqual("hunter2", "hunter3")).toBe(false);
    expect(secretsEqual("short", "a much longer secret")).toBe(false);
    expect(secretsEqual("", "")).toBe(true);
  });
});

describe("canViewArchive", () => {
  it("allows public and entered only", () => {
    expect(canViewArchive("public")).toBe(true);
    expect(canViewArchive("entered")).toBe(true);
    expect(canViewArchive("gate-required")).toBe(false);
    expect(canViewArchive("preview")).toBe(false);
  });
});
