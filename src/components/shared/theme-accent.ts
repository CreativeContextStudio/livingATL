/**
 * Per-theme accent palettes — drives the Player's dynamic identity.
 *
 * Every recording has `metadata_extracted.themes: string[]`, ordered so
 * `themes[0]` is the recording's top (most-prominent) theme. `getThemeAccent()`
 * reads that first theme and returns a handcrafted palette for the surfaces
 * that re-color per recording:
 *   - Waveform wave + progress + cursor (wavesurfer's constructor takes raw
 *     hex strings, not Tailwind classes — hence the `hex` sub-palette)
 *   - Chapter-scrubber active/highlight chapter fills
 *   - Portrait band above the storyteller name on the Player page
 *   - Transport play button + progress scrubber indicator
 *
 * Adding a new theme to `THEME_TAXONOMY` in `livingatl-pipeline/scripts/config.py`
 * must be paired with a palette entry here. Fallback is `PRIMARY_ACCENT`
 * (Atlanta coral) which matches the default Player chrome.
 *
 * Class strings are written out literally instead of composed via template
 * literals — Tailwind JIT needs to see the full utility class in source to
 * include it in the build output.
 */

export type ThemeAccent = {
  tailwind: {
    /** Subtle tinted background for the portrait band + non-active chapter base. */
    bgSoft: string;
    /** Mid-strength tinted background for curated "highlight" chapters. */
    bgMedium: string;
    /** Solid saturated background for active chapter + play button. */
    bgStrong: string;
    /** Foreground text color that reads on `bgSoft` / `bgMedium`. */
    text: string;
    /** Foreground text color that reads on `bgStrong` (inverted). */
    textOn: string;
    /** Ring utility for focus / active outlines. */
    ring: string;
    /** Border utility for portrait band underline + chapter divider. */
    border: string;
  };
  hex: {
    /** Inactive waveform bar color (muted tint). */
    wave: string;
    /** Played-progress waveform + cursor-line accent. */
    progress: string;
    /** Vertical cursor line color — kept dark across all themes for
     *  legibility against light waveforms. */
    cursor: string;
  };
};

const CURSOR_HEX = "#1a1a2e";

const PRIMARY_ACCENT: ThemeAccent = {
  tailwind: {
    bgSoft: "bg-primary/10",
    bgMedium: "bg-primary/50",
    bgStrong: "bg-primary",
    text: "text-primary",
    textOn: "text-primary-foreground",
    ring: "ring-primary/40",
    border: "border-primary/30",
  },
  hex: {
    wave: "#f0e5df",
    progress: "#ff7f5c",
    cursor: CURSOR_HEX,
  },
};

export const THEME_ACCENT_PALETTE: Record<string, ThemeAccent> = {
  // Civil rights — flagship theme of the collection; keeps the Atlanta coral
  // identity so the majority of recordings retain the default look.
  civil_rights: PRIMARY_ACCENT,

  // Segregation — muted slate. Somber, institutional, doesn't overlap with
  // civil_rights (which is punchy coral) so movement recordings and the
  // segregated systems they confronted read visually distinct.
  segregation: {
    tailwind: {
      bgSoft: "bg-slate-500/10",
      bgMedium: "bg-slate-500/50",
      bgStrong: "bg-slate-500",
      text: "text-slate-700 dark:text-slate-300",
      textOn: "text-white",
      ring: "ring-slate-500/40",
      border: "border-slate-500/30",
    },
    hex: { wave: "#e2e8f0", progress: "#64748b", cursor: CURSOR_HEX },
  },

  // Integration — teal. Hopeful, forward-looking, paired inverse of
  // segregation's cool slate.
  integration: {
    tailwind: {
      bgSoft: "bg-teal-500/10",
      bgMedium: "bg-teal-500/50",
      bgStrong: "bg-teal-500",
      text: "text-teal-700 dark:text-teal-300",
      textOn: "text-white",
      ring: "ring-teal-500/40",
      border: "border-teal-500/30",
    },
    hex: { wave: "#ccfbf1", progress: "#14b8a6", cursor: CURSOR_HEX },
  },

  // Education — sky blue. The universal "institution of learning" cue.
  education: {
    tailwind: {
      bgSoft: "bg-sky-500/10",
      bgMedium: "bg-sky-500/50",
      bgStrong: "bg-sky-500",
      text: "text-sky-700 dark:text-sky-300",
      textOn: "text-white",
      ring: "ring-sky-500/40",
      border: "border-sky-500/30",
    },
    hex: { wave: "#e0f2fe", progress: "#0ea5e9", cursor: CURSOR_HEX },
  },

  // Housing — warm amber. Home-adjacent hue, paired with family.
  housing: {
    tailwind: {
      bgSoft: "bg-amber-500/10",
      bgMedium: "bg-amber-500/50",
      bgStrong: "bg-amber-500",
      text: "text-amber-700 dark:text-amber-300",
      textOn: "text-white",
      ring: "ring-amber-500/40",
      border: "border-amber-500/30",
    },
    hex: { wave: "#fef3c7", progress: "#f59e0b", cursor: CURSOR_HEX },
  },

  // Employment — orange. Industry, working-day warmth.
  employment: {
    tailwind: {
      bgSoft: "bg-orange-500/10",
      bgMedium: "bg-orange-500/50",
      bgStrong: "bg-orange-500",
      text: "text-orange-700 dark:text-orange-300",
      textOn: "text-white",
      ring: "ring-orange-500/40",
      border: "border-orange-500/30",
    },
    hex: { wave: "#ffedd5", progress: "#f97316", cursor: CURSOR_HEX },
  },

  // Religion — violet. Liturgical, contemplative.
  religion: {
    tailwind: {
      bgSoft: "bg-violet-500/10",
      bgMedium: "bg-violet-500/50",
      bgStrong: "bg-violet-500",
      text: "text-violet-700 dark:text-violet-300",
      textOn: "text-white",
      ring: "ring-violet-500/40",
      border: "border-violet-500/30",
    },
    hex: { wave: "#ede9fe", progress: "#8b5cf6", cursor: CURSOR_HEX },
  },

  // Family — pink. Domestic warmth without the industrial feel of amber.
  family: {
    tailwind: {
      bgSoft: "bg-pink-500/10",
      bgMedium: "bg-pink-500/50",
      bgStrong: "bg-pink-500",
      text: "text-pink-700 dark:text-pink-300",
      textOn: "text-white",
      ring: "ring-pink-500/40",
      border: "border-pink-500/30",
    },
    hex: { wave: "#fce7f3", progress: "#ec4899", cursor: CURSOR_HEX },
  },

  // Community — lime. Collective, emergent, the gather-hue.
  community: {
    tailwind: {
      bgSoft: "bg-lime-500/10",
      bgMedium: "bg-lime-500/50",
      bgStrong: "bg-lime-500",
      text: "text-lime-700 dark:text-lime-300",
      textOn: "text-white",
      ring: "ring-lime-500/40",
      border: "border-lime-500/30",
    },
    hex: { wave: "#ecfccb", progress: "#84cc16", cursor: CURSOR_HEX },
  },

  // Music — purple. Expressive, performative.
  music: {
    tailwind: {
      bgSoft: "bg-purple-500/10",
      bgMedium: "bg-purple-500/50",
      bgStrong: "bg-purple-500",
      text: "text-purple-700 dark:text-purple-300",
      textOn: "text-white",
      ring: "ring-purple-500/40",
      border: "border-purple-500/30",
    },
    hex: { wave: "#f3e8ff", progress: "#a855f7", cursor: CURSOR_HEX },
  },

  // Arts — fuchsia. Adjacent to music but more visual, more galleries.
  arts: {
    tailwind: {
      bgSoft: "bg-fuchsia-500/10",
      bgMedium: "bg-fuchsia-500/50",
      bgStrong: "bg-fuchsia-500",
      text: "text-fuchsia-700 dark:text-fuchsia-300",
      textOn: "text-white",
      ring: "ring-fuchsia-500/40",
      border: "border-fuchsia-500/30",
    },
    hex: { wave: "#fae8ff", progress: "#d946ef", cursor: CURSOR_HEX },
  },

  // Politics — cyan. Civic engagement, not-quite-government.
  politics: {
    tailwind: {
      bgSoft: "bg-cyan-500/10",
      bgMedium: "bg-cyan-500/50",
      bgStrong: "bg-cyan-500",
      text: "text-cyan-700 dark:text-cyan-300",
      textOn: "text-white",
      ring: "ring-cyan-500/40",
      border: "border-cyan-500/30",
    },
    hex: { wave: "#cffafe", progress: "#06b6d4", cursor: CURSOR_HEX },
  },

  // Health — emerald. Wellness-adjacent, distinct from sports green.
  health: {
    tailwind: {
      bgSoft: "bg-emerald-500/10",
      bgMedium: "bg-emerald-500/50",
      bgStrong: "bg-emerald-500",
      text: "text-emerald-700 dark:text-emerald-300",
      textOn: "text-white",
      ring: "ring-emerald-500/40",
      border: "border-emerald-500/30",
    },
    hex: { wave: "#d1fae5", progress: "#10b981", cursor: CURSOR_HEX },
  },

  // Migration — yellow-ochre. Journey, roads, wheatfields, leaving.
  migration: {
    tailwind: {
      bgSoft: "bg-yellow-500/10",
      bgMedium: "bg-yellow-500/50",
      bgStrong: "bg-yellow-600",
      text: "text-yellow-700 dark:text-yellow-300",
      textOn: "text-white",
      ring: "ring-yellow-500/40",
      border: "border-yellow-500/30",
    },
    hex: { wave: "#fef9c3", progress: "#ca8a04", cursor: CURSOR_HEX },
  },

  // Urban renewal — zinc. Concrete, infrastructure, brutalist.
  urban_renewal: {
    tailwind: {
      bgSoft: "bg-zinc-500/10",
      bgMedium: "bg-zinc-500/50",
      bgStrong: "bg-zinc-500",
      text: "text-zinc-700 dark:text-zinc-300",
      textOn: "text-white",
      ring: "ring-zinc-500/40",
      border: "border-zinc-500/30",
    },
    hex: { wave: "#e4e4e7", progress: "#71717a", cursor: CURSOR_HEX },
  },

  // Transportation — blue. Road-sign blue / railway blue.
  transportation: {
    tailwind: {
      bgSoft: "bg-blue-500/10",
      bgMedium: "bg-blue-500/50",
      bgStrong: "bg-blue-500",
      text: "text-blue-700 dark:text-blue-300",
      textOn: "text-white",
      ring: "ring-blue-500/40",
      border: "border-blue-500/30",
    },
    hex: { wave: "#dbeafe", progress: "#3b82f6", cursor: CURSOR_HEX },
  },

  // Business — indigo. Commercial, institutional, distinct from politics.
  business: {
    tailwind: {
      bgSoft: "bg-indigo-500/10",
      bgMedium: "bg-indigo-500/50",
      bgStrong: "bg-indigo-500",
      text: "text-indigo-700 dark:text-indigo-300",
      textOn: "text-white",
      ring: "ring-indigo-500/40",
      border: "border-indigo-500/30",
    },
    hex: { wave: "#e0e7ff", progress: "#6366f1", cursor: CURSOR_HEX },
  },

  // Crime — red. Destructive palette, highest-alert hue.
  crime: {
    tailwind: {
      bgSoft: "bg-red-500/10",
      bgMedium: "bg-red-500/50",
      bgStrong: "bg-red-500",
      text: "text-red-700 dark:text-red-300",
      textOn: "text-white",
      ring: "ring-red-500/40",
      border: "border-red-500/30",
    },
    hex: { wave: "#fee2e2", progress: "#ef4444", cursor: CURSOR_HEX },
  },

  // Sports — green. Athletic-field green, distinct from health emerald.
  sports: {
    tailwind: {
      bgSoft: "bg-green-500/10",
      bgMedium: "bg-green-500/50",
      bgStrong: "bg-green-500",
      text: "text-green-700 dark:text-green-300",
      textOn: "text-white",
      ring: "ring-green-500/40",
      border: "border-green-500/30",
    },
    hex: { wave: "#dcfce7", progress: "#22c55e", cursor: CURSOR_HEX },
  },

  // Military — stone. Uniform-adjacent earth tone.
  military: {
    tailwind: {
      bgSoft: "bg-stone-500/10",
      bgMedium: "bg-stone-500/50",
      bgStrong: "bg-stone-500",
      text: "text-stone-700 dark:text-stone-300",
      textOn: "text-white",
      ring: "ring-stone-500/40",
      border: "border-stone-500/30",
    },
    hex: { wave: "#e7e5e4", progress: "#78716c", cursor: CURSOR_HEX },
  },

  // Food culture — rose. Warmth of kitchens and restaurants.
  food_culture: {
    tailwind: {
      bgSoft: "bg-rose-500/10",
      bgMedium: "bg-rose-500/50",
      bgStrong: "bg-rose-500",
      text: "text-rose-700 dark:text-rose-300",
      textOn: "text-white",
      ring: "ring-rose-500/40",
      border: "border-rose-500/30",
    },
    hex: { wave: "#ffe4e6", progress: "#f43f5e", cursor: CURSOR_HEX },
  },
};

/**
 * Pick the accent palette for a recording's theme list. Uses `themes[0]`
 * (the top/most-prominent theme per the §6.5 extraction contract).
 * Falls back to the Atlanta coral `PRIMARY_ACCENT` when themes is empty
 * or `themes[0]` isn't in the palette map (e.g., a pipeline update adds
 * a new taxonomy value before this file is synced).
 */
export function getThemeAccent(
  themes: string[] | null | undefined,
): ThemeAccent {
  if (!themes || themes.length === 0) return PRIMARY_ACCENT;
  return THEME_ACCENT_PALETTE[themes[0]] ?? PRIMARY_ACCENT;
}

/** Exported so callers that want the neutral identity (e.g., pages with
 *  no recording yet) can use the same object the fallback returns. */
export { PRIMARY_ACCENT };
