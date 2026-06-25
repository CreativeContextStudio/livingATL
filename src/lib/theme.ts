/**
 * Theme selection — three values that drive the `data-theme` attribute on
 * `<html>`. See `globals.css` for the CSS custom property blocks.
 *
 *   - `light` → Atlanta Brand System Neon+Peach (current default, PRD §11)
 *   - `dark`  → Atlanta Brand System Canopy+Concrete (warm parchment,
 *                 not a traditional dark mode)
 *   - `geist` → neutral fallback with system fonts, shipped as an escape
 *                 hatch while the ABS rollout is under review
 */
export const THEMES = ["light", "dark", "geist"] as const;

export type Theme = (typeof THEMES)[number];

export const DEFAULT_THEME: Theme = "light";

export const THEME_COOKIE = "livingatl-theme";

/** Max-age: 1 year. Theme preference is low-stakes; long expiry. */
export const THEME_COOKIE_MAX_AGE_S = 60 * 60 * 24 * 365;

export function isValidTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

export function resolveTheme(cookieValue: string | undefined): Theme {
  return isValidTheme(cookieValue) ? cookieValue : DEFAULT_THEME;
}

export const THEME_LABELS: Record<Theme, string> = {
  light: "Light",
  dark: "Dark",
  geist: "Geist",
};
