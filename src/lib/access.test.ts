import { describe, expect, it } from "vitest";

import {
  GATE_COOKIE_MAX_AGE_S,
  canViewArchive,
  inviteIdFromCookie,
  resolveAccess,
  secretsEqual,
  signGateCookie,
  signInviteCookie,
  verifyGateCookie,
} from "./access";
import { hashInviteToken, looksLikeInviteToken } from "./invite-token";

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

describe("invite cookie signing", () => {
  const ID = "6f1c2b9e-4a7d-4c1e-9b3a-2d5e8f0a1b2c";
  const issued = Date.UTC(2026, 0, 1);

  it("round-trips the invite id and passes the gate check", () => {
    const cookie = signInviteCookie(TOKEN, ID, null, issued);
    expect(cookie).toMatch(/^v2\.[0-9a-f-]{36}\.\d+\.[A-Za-z0-9_-]{43}$/);
    expect(inviteIdFromCookie(cookie, TOKEN, issued)).toBe(ID);
    expect(verifyGateCookie(cookie, TOKEN, issued)).toBe(true);
    // resolveAccess checks against the real clock.
    const fresh = signInviteCookie(TOKEN, ID, null);
    expect(resolveAccess(fresh, { SITE_GATE_TOKEN: TOKEN })).toBe("entered");
  });

  it("expires with the invite when that comes first", () => {
    const inviteEnds = new Date(issued + 3 * 24 * 3600 * 1000);
    const cookie = signInviteCookie(TOKEN, ID, inviteEnds, issued);
    expect(inviteIdFromCookie(cookie, TOKEN, inviteEnds.getTime() - 1000)).toBe(ID);
    expect(inviteIdFromCookie(cookie, TOKEN, inviteEnds.getTime())).toBeNull();
    const later = signInviteCookie(TOKEN, ID, new Date(issued + 365 * 24 * 3600 * 1000), issued);
    expect(inviteIdFromCookie(later, TOKEN, issued + GATE_COOKIE_MAX_AGE_S * 1000)).toBeNull();
  });

  it("rejects a swapped invite id, a rotated token, and password cookies", () => {
    const cookie = signInviteCookie(TOKEN, ID, null, issued);
    const swapped = cookie.replace(ID, "00000000-0000-4000-8000-000000000000");
    expect(inviteIdFromCookie(swapped, TOKEN, issued)).toBeNull();
    expect(verifyGateCookie(swapped, TOKEN, issued)).toBe(false);
    expect(inviteIdFromCookie(cookie, "c".repeat(64), issued)).toBeNull();
    expect(inviteIdFromCookie(COOKIE, TOKEN)).toBeNull();
  });
});

describe("invite tokens", () => {
  it("hashes to the hex SHA-256 the pipeline stores", () => {
    // python: hashlib.sha256(b"abc").hexdigest()
    expect(hashInviteToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
  it("accepts token_urlsafe(32) shapes only", () => {
    expect(looksLikeInviteToken("A".repeat(43))).toBe(true);
    expect(looksLikeInviteToken("short")).toBe(false);
    expect(looksLikeInviteToken("a".repeat(40) + "/..")).toBe(false);
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
