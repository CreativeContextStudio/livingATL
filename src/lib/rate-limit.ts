/**
 * Fixed-window, in-memory rate limiter.
 *
 * This is per server instance: Fluid compute reuses instances, so it does slow
 * a single scripted client, but it is not a global limit. The authoritative
 * limit is a Vercel Firewall rate-limit rule on the same path; this is the
 * in-code backstop so the endpoint is never completely unbounded.
 */

type Window = { count: number; resetAt: number };

export type RateLimitRule = { limit: number; windowMs: number };

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number };

const MAX_TRACKED_KEYS = 10_000;

export function createRateLimiter(rules: RateLimitRule[]) {
  const buckets = rules.map(() => new Map<string, Window>());

  return function check(key: string, now = Date.now()): RateLimitResult {
    let retryAfterMs = 0;
    rules.forEach((rule, i) => {
      const map = buckets[i];
      let w = map.get(key);
      if (!w || w.resetAt <= now) {
        if (map.size >= MAX_TRACKED_KEYS) map.clear();
        w = { count: 0, resetAt: now + rule.windowMs };
        map.set(key, w);
      }
      w.count += 1;
      if (w.count > rule.limit) {
        retryAfterMs = Math.max(retryAfterMs, w.resetAt - now);
      }
    });
    return retryAfterMs > 0
      ? { ok: false, retryAfterSeconds: Math.ceil(retryAfterMs / 1000) }
      : { ok: true };
  };
}

/** Best-effort client IP. Vercel sets `x-forwarded-for` (client first). */
export function clientIp(req: { headers: Pick<Headers, "get"> }): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
