import "server-only";

import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";

const ALLOWED_TAGS = new Set(["facets", "neighborhoods", "archive-stats"]);

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function authorized(req: NextRequest): boolean {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const prefix = "Bearer ";
  if (!header.startsWith(prefix)) return false;
  return timingSafeEqual(header.slice(prefix.length), secret);
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return Response.json({ revalidated: false, error: "unauthorized" }, { status: 401 });
  }

  const tag = req.nextUrl.searchParams.get("tag");
  if (!tag) {
    return Response.json(
      { revalidated: false, error: "missing tag" },
      { status: 400 },
    );
  }
  if (!ALLOWED_TAGS.has(tag)) {
    return Response.json(
      { revalidated: false, error: "unknown tag", allowed: Array.from(ALLOWED_TAGS) },
      { status: 400 },
    );
  }

  revalidateTag(tag, "max");
  return Response.json({ revalidated: true, tag, now: Date.now() });
}
