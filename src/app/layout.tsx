import type { Metadata, Viewport } from "next";
import { Space_Grotesk, DM_Sans, JetBrains_Mono } from "next/font/google";
import { cookies } from "next/headers";

import { PostHogPageviewProvider } from "@/components/analytics/posthog-provider";
import { SiteFooter } from "@/components/shell/site-footer";
import { SiteHeader } from "@/components/shell/site-header";
import { THEME_COOKIE, resolveTheme } from "@/lib/theme";
import "./globals.css";

/**
 * Atlanta Brand System fonts (Style Guide §3):
 *   - Space Grotesk → display/headings (`font-heading`)
 *   - DM Sans → body (`font-sans`)
 *   - JetBrains Mono → code, catalog IDs (`font-mono`)
 *
 * The `variable` option defines a CSS variable name for each font; attaching
 * those variables to <html> via `className` is how next/font registers the
 * fonts with the document (it injects `@font-face` + preload links for
 * every font whose className lands on a DOM element). Tailwind's utility
 * classes resolve via the literal font family names declared in
 * `globals.css::@theme inline`, which is why that block uses `"DM Sans"`
 * and not `var(--font-dm-sans)` — see the `Tailwind v4 @theme inline`
 * gotcha in CLAUDE.md.
 */
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "livingATL. Atlanta oral history, made findable",
    template: "%s · livingATL",
  },
  description:
    "A public platform where Atlanta's stories live, grow, and find their way back into the spaces where they happened.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff8f5" },
    { media: "(prefers-color-scheme: dark)", color: "#232326" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const theme = resolveTheme(cookieStore.get(THEME_COOKIE)?.value);

  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${spaceGrotesk.variable} ${dmSans.variable} ${jetBrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh flex flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
        >
          Skip to content
        </a>
        <SiteHeader initialTheme={theme} />
        <div
          id="main"
          tabIndex={-1}
          className="flex flex-1 flex-col focus:outline-none"
        >
          {children}
        </div>
        <SiteFooter />
        <PostHogPageviewProvider />
      </body>
    </html>
  );
}
