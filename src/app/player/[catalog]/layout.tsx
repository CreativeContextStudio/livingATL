import { notFound } from "next/navigation";

import { requireArchiveAccess } from "@/lib/access-request";
import { safeDecodeCatalog } from "@/lib/player";
import { recordingByCatalog } from "@/lib/queries/recordings";

/**
 * Access + existence checks that must finish before `loading.tsx` streams.
 * After the first byte the status is locked at 200, so a `notFound()` from
 * the page arrives as a soft 404 and a `redirect()` as a `<meta refresh>`.
 * Here they stay a real 404 / 307. `recordingByCatalog` is a single indexed
 * lookup (and applies the same `completed`-only publish rule as the page),
 * so the heavy player fetch still streams behind the skeleton.
 */
export default async function PlayerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ catalog: string }>;
}) {
  await requireArchiveAccess();
  const catalog = safeDecodeCatalog((await params).catalog);
  if (!catalog || !(await recordingByCatalog(catalog))) notFound();
  return children;
}
