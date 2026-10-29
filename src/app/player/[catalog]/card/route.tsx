import { ImageResponse } from "next/og";

import { getThemeAccent } from "@/components/shared/theme-accent";
import { canRequestViewArchive } from "@/lib/access-request";
import { clipQuote, parseClipRange } from "@/lib/clips";
import { formatSpeakerName, titleForCard } from "@/lib/format";
import { formatTimestamp, safeDecodeCatalog } from "@/lib/player";
import { fetchPlayerData } from "@/lib/queries/player";

/**
 * Share card (Open Graph / Twitter image) for a recording or a clip:
 * `/player/<catalog>/card[?t=12:04&end=13:34]`. Clip links quote the clip's
 * own words; plain recording links use the first key quote. Archive access
 * rules apply, so while the site is gated crawlers get a 404 — share
 * previews start working when the archive goes public.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ catalog: string }> },
): Promise<Response> {
  if (!(await canRequestViewArchive())) return new Response("Not found", { status: 404 });
  const catalog = safeDecodeCatalog((await params).catalog);
  const data = catalog ? await fetchPlayerData(catalog) : null;
  if (!data) return new Response("Not found", { status: 404 });

  const sp = new URL(req.url).searchParams;
  const clip = parseClipRange(sp.get("t"), sp.get("end"));
  const quote = clip
    ? clipQuote(data.transcriptSegments, clip, 200)
    : (data.keyQuotes[0]?.text ?? data.briefOverview ?? "").slice(0, 200);
  const interviewee = data.speakers.find((s) => s.role === "interviewee");
  const name = interviewee ? formatSpeakerName(interviewee.name) : titleForCard(data.title);
  const year = data.recordingDate?.slice(0, 4);
  const accent = getThemeAccent(data.themes).hex.progress;
  const footer = clip
    ? `Clip ${formatTimestamp(clip.start)}–${formatTimestamp(clip.end)}`
    : titleForCard(data.title);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#fff8f5",
          color: "#1a1a2e",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 96, height: 12, borderRadius: 6, background: accent }} />
          <div style={{ fontSize: 28, letterSpacing: 4, color: "#5c5470" }}>LIVING ATLANTA ORAL HISTORY</div>
        </div>
        <div style={{ display: "flex", fontSize: quote.length > 140 ? 42 : 52, lineHeight: 1.3, fontWeight: 600 }}>
          {quote ? `“${quote}”` : name}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 40, fontWeight: 700 }}>{name}</div>
            <div style={{ fontSize: 26, color: "#5c5470" }}>
              {[footer, year].filter(Boolean).join(" · ")}
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 700 }}>
            living<span style={{ color: "#b8431f" }}>ATL</span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
