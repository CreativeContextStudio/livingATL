import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db";

/**
 * Liveness probe — allowlisted in `src/proxy.ts`, so it answers without the
 * gate cookie. The default response never touches the database (cheap, safe
 * to poll). `?db=1` adds a `select 1` round-trip so an uptime monitor can
 * catch the Supabase free-tier auto-pause; it returns 503 when the DB is
 * unreachable.
 */
export async function GET(req: Request): Promise<Response> {
  const headers = { "Cache-Control": "no-store" };
  const body = {
    ok: true,
    // Set by Vercel on Git-integrated deploys; null for CLI uploads and local.
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    env: process.env.VERCEL_ENV ?? "local",
  };

  if (new URL(req.url).searchParams.get("db") !== "1") {
    return Response.json(body, { headers });
  }

  const started = Date.now();
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ...body, db: "ok", dbMs: Date.now() - started }, { headers });
  } catch (err) {
    console.error("[health] database unreachable", err);
    return Response.json(
      { ...body, ok: false, db: "unreachable" },
      { status: 503, headers },
    );
  }
}
