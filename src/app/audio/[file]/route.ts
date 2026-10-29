import type { NextRequest } from "next/server";

import { cappedRange } from "@/lib/audio-range";

/**
 * Same-origin audio — `/audio/<stem>.mp3`, relayed from the Cloudflare R2
 * bucket (whose public r2.dev URL sends no CORS headers).
 *
 * This replaced a plain `next.config` rewrite on 2026-10-29. R2 marks the
 * files `public, max-age=31536000, immutable`, so Vercel's CDN cached the
 * rewrite's *partial* (206) responses keyed by path alone: whichever byte
 * range was requested first — Safari probes `bytes=0-1` — was then served
 * for every later range of that recording, and playback broke.
 *
 * Here every response is `private` (browsers may cache it; the CDN may
 * not), Range requests are forwarded, and each response carries at most
 * MAX_CHUNK bytes (a short 206 is valid; media elements just request the
 * next range), which keeps responses well under function payload limits.
 * Requests without a Range header (downloads) are redirected to R2.
 *
 * Move to a Cloudflare custom domain (proper CDN + CORS) before public
 * launch; then point `recordings.audio_url` there and delete this route.
 */

const R2_ORIGIN = "https://pub-fd228e83f3154be8aa86ac191a8244de.r2.dev";
const FILE = /^[A-Za-z0-9_-]{1,80}\.mp3$/;

const NO_CDN = {
  "Cache-Control": "private, max-age=86400",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
};

function upstreamUrl(file: string): string {
  return `${R2_ORIGIN}/audio/${file}`;
}

async function relay(req: NextRequest, file: string, method: "GET" | "HEAD"): Promise<Response> {
  if (!FILE.test(file)) return new Response("Not found", { status: 404 });
  const range = req.headers.get("range");
  if (method === "GET" && !range) {
    return Response.redirect(upstreamUrl(file), 302);
  }
  const upstream = await fetch(upstreamUrl(file), {
    method,
    headers: range ? { Range: cappedRange(range)! } : {},
    cache: "no-store",
  });
  if (upstream.status === 404) return new Response("Not found", { status: 404 });
  const headers = new Headers(NO_CDN);
  headers.set("Accept-Ranges", "bytes");
  for (const h of ["content-type", "content-length", "content-range", "etag", "last-modified"]) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  return new Response(method === "HEAD" ? null : upstream.body, { status: upstream.status, headers });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ file: string }> }) {
  return relay(req, (await params).file, "GET");
}

export async function HEAD(req: NextRequest, { params }: { params: Promise<{ file: string }> }) {
  return relay(req, (await params).file, "HEAD");
}
