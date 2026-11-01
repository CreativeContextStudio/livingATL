import type { Metadata } from "next";

import { PreviewHero } from "@/components/preview-hero";

export const metadata: Metadata = {
  title: "Invite-only preview",
  description:
    "livingATL is opening the Living Atlanta oral history collection (1914–1977): 500+ recordings from the people who lived the city. Invite-only while we finalize rights and stewardship with WRFG and the Atlanta History Center.",
  robots: { index: false, follow: false },
};

export default function PreviewPage() {
  return <PreviewHero />;
}
