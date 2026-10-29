"use client";

import { useSyncExternalStore } from "react";

/**
 * The active site theme as set on `<html data-theme>` (server-rendered from
 * the theme cookie, updated in place by the theme switcher). For client
 * components that paint outside CSS — Mapbox basemaps, wavesurfer canvases —
 * and so can't pick colors up from CSS variables.
 */
function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

const readTheme = () => document.documentElement.dataset.theme ?? "light";

export function useDocumentTheme(): string {
  return useSyncExternalStore(subscribeTheme, readTheme, () => "light");
}
