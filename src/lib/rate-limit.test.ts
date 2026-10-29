import { describe, expect, it } from "vitest";

import { clientIp, createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("allows up to the limit, then reports retry-after", () => {
    const check = createRateLimiter([{ limit: 3, windowMs: 1000 }]);
    expect([0, 0, 0].map(() => check("ip", 0).ok)).toEqual([true, true, true]);
    expect(check("ip", 0)).toEqual({ ok: false, retryAfterSeconds: 1 });
  });

  it("resets after the window and keeps keys independent", () => {
    const check = createRateLimiter([{ limit: 1, windowMs: 1000 }]);
    check("ip", 0);
    expect(check("ip", 500).ok).toBe(false);
    expect(check("other", 500).ok).toBe(true);
    expect(check("ip", 1000).ok).toBe(true);
  });

  it("applies every rule (burst and sustained)", () => {
    const check = createRateLimiter([
      { limit: 2, windowMs: 1000 },
      { limit: 3, windowMs: 60_000 },
    ]);
    expect(check("ip", 0).ok).toBe(true);
    expect(check("ip", 0).ok).toBe(true);
    expect(check("ip", 1000).ok).toBe(true); // new burst window, 3rd in the minute
    expect(check("ip", 2000)).toEqual({ ok: false, retryAfterSeconds: 58 });
  });
});

describe("clientIp", () => {
  it("takes the first x-forwarded-for hop, then x-real-ip", () => {
    const req = (headers: Record<string, string>) => new Request("http://x.test", { headers });
    expect(clientIp(req({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }))).toBe("1.2.3.4");
    expect(clientIp(req({ "x-real-ip": "5.6.7.8" }))).toBe("5.6.7.8");
    expect(clientIp(req({}))).toBe("unknown");
  });
});
