import { requireArchiveAccess } from "@/lib/access-request";

/**
 * Runs the PRD §8.8 access backstop before this segment's `loading.tsx`
 * starts streaming. Once a Suspense fallback streams, the status is fixed at
 * 200 and `redirect()` can only arrive as a `<meta refresh>`; checking here
 * keeps it a real 307. The page repeats the check (layouts aren't re-run on
 * every client navigation) — both are cheap cookie reads.
 */
export default async function ArchiveSegmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireArchiveAccess();
  return children;
}
