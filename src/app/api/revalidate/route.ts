import "server-only";

import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";

import { secretsEqual } from "@/lib/access";

const ALLOWED_TAGS = new Set(["facets", "neighborhoods", "archive-stats", "invites"]);

function authorized(req: NextRequest): boolean {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const prefix = "Bearer ";
  if (!header.startsWith(prefix)) return false;
  return secretsEqual(header.slice(prefix.length), secret);
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

  // Archive facets can be served stale while they refresh. A revoked invite
  // must not get one more stale "still active" answer, so that tag expires
  // outright and the next request re-checks the database.
  revalidateTag(tag, tag === "invites" ? { expire: 0 } : "max");
  return Response.json({ revalidated: true, tag, now: Date.now() });
}
