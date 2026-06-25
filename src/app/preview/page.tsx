import type { Metadata } from "next";

import { PreviewHero } from "@/components/preview-hero";
import { fetchArchiveStats } from "@/lib/queries/recordings";

export const metadata: Metadata = {
  title: "livingATL. Invite-only preview",
  description:
    "livingATL is opening the Living Atlanta oral history collection (1914–1977): 500+ recordings from the people who lived the city. Invite-only while we finalize rights and stewardship with WRFG and the Atlanta History Center.",
  robots: { index: false, follow: false },
};

export default async function PreviewPage() {
  const { processedRecordings, distinctInterviewees } =
    await fetchArchiveStats();
  return (
    <PreviewHero
      processedRecordings={processedRecordings}
      distinctInterviewees={distinctInterviewees}
    />
  );
}
