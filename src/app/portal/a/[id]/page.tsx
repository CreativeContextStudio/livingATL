import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageSquareTextIcon } from "lucide-react";

import { CitationsPanel } from "@/components/portal/citations-panel";
import { PortalResponseCard } from "@/components/portal/portal-response-card";
import { PlayCitationsButton } from "@/components/queue/queue-buttons";
import { requireArchiveAccess } from "@/lib/access-request";
import { getShare } from "@/lib/queries/portal-shares";

/**
 * Shared Portal answer — `/portal/a/<id>` (F-portal-share). Shows the
 * question and the archive's answer exactly as generated (stored only after
 * its signature verified), with its cited sources, inline playback, and a
 * way into the Portal. Never indexed: questions are visitor-written.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const share = await getShare((await params).id);
  const robots = { index: false, follow: false };
  if (!share) return { robots };
  const title = share.question.length > 80 ? `${share.question.slice(0, 79)}…` : share.question;
  return {
    title,
    description: share.answer.replace(/\[\d+(?:\s*[,|]\s*\d+)*\]/g, "").replace(/\s+/g, " ").slice(0, 160),
    robots,
  };
}

export default async function SharedAnswerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireArchiveAccess();
  const share = await getShare((await params).id);
  if (!share) notFound();
  const date = share.createdAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <main className="page-container page-y flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:gap-4">
        <p className="eyebrow flex items-center gap-1.5">
          <MessageSquareTextIcon aria-hidden className="size-3.5" />
          Shared answer
        </p>
        <h1 className="font-heading text-[clamp(1.75rem,1.3rem+1.8vw,2.75rem)] font-bold leading-[1.1] tracking-tight text-balance">{share.question}</h1>
        <p className="text-sm text-muted-foreground">
          Asked {date}. The answer below is AI-generated from the archive&apos;s transcripts; the
          sources it cites are the recordings themselves.
        </p>
      </header>
      <section aria-label="Archive answer" className="flex max-w-4xl flex-col gap-4">
        <PortalResponseCard text={share.answer} citations={share.citations} />
        <CitationsPanel citations={share.citations} />
        <PlayCitationsButton citations={share.citations} />
      </section>
      <p className="text-sm">
        <Link href="/portal" className="inline-flex min-h-6 items-center font-medium text-primary-ink underline-offset-4 hover:underline pointer-coarse:min-h-11 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Ask your own question
        </Link>
      </p>
    </main>
  );
}
