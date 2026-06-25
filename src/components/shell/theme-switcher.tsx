"use client";

import { useCallback, useState } from "react";
import { PaletteIcon } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  THEME_COOKIE,
  THEME_COOKIE_MAX_AGE_S,
  THEME_LABELS,
  THEMES,
  isValidTheme,
  type Theme,
} from "@/lib/theme";

function writeThemeCookie(theme: Theme): void {
  const parts = [
    `${THEME_COOKIE}=${theme}`,
    "Path=/",
    `Max-Age=${THEME_COOKIE_MAX_AGE_S}`,
    "SameSite=Lax",
  ];
  if (window.location.protocol === "https:") parts.push("Secure");
  document.cookie = parts.join("; ");
}

/**
 * Theme switcher — lives in the site header. Takes the server-resolved
 * `initialTheme` as a prop so SSR and hydration agree on the selected
 * value without a `useEffect`-and-setState hydration dance. Writes the
 * `livingatl-theme` cookie client-side and mutates
 * `document.documentElement.dataset.theme` for instant feedback without
 * a route refresh; the root layout re-reads the cookie on the next
 * navigation so SSR stays in sync.
 */
export function ThemeSwitcher({ initialTheme }: { initialTheme: Theme }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  const onChange = useCallback((next: string | null) => {
    if (!isValidTheme(next)) return;
    setTheme(next);
    document.documentElement.dataset.theme = next;
    writeThemeCookie(next);
  }, []);

  return (
    <Select value={theme} onValueChange={onChange}>
      <SelectTrigger
        aria-label={`Theme: ${THEME_LABELS[theme]}`}
        className="size-9 justify-center rounded-lg px-0"
      >
        <PaletteIcon aria-hidden className="size-4 text-muted-foreground" />
        <SelectValue className="sr-only">
          {(v) => (typeof v === "string" && isValidTheme(v) ? THEME_LABELS[v] : "Theme")}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {THEMES.map((t) => (
          <SelectItem key={t} value={t}>
            {THEME_LABELS[t]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
