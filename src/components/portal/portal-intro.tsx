import { PageHeader } from "@/components/shell/page-header";

/**
 * Portal page intro: eyebrow, headline, and one short explainer. (The
 * former left-column rail — span bar, stats, "no fabricated quotes",
 * explore links — repeated Home and About and was removed 2026-10-29.)
 */
export function PortalIntro() {
  return (
    <PageHeader
      accentBar
      eyebrow="Ask the archive"
      title="Ask about six decades of Atlanta."
      lead="Ask about a person, a neighborhood, an era, an event. Answers come from the Living Atlanta oral history collection and cite the recordings and timestamps they drew from. If the archive doesn’t cover your question, it will say so."
    />
  );
}
