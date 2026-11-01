"use client";

import { useParams } from "next/navigation";

import { safeDecodeCatalog } from "@/lib/player";

/** Catalog number of the recording this Player page shows (for analytics). */
export function usePlayerCatalog(): string {
  const { catalog } = useParams<{ catalog: string }>();
  return safeDecodeCatalog(catalog) ?? catalog;
}
