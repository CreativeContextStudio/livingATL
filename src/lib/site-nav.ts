/**
 * The site's four doors. Every page lives in one section; sections with more
 * than one page show them as tabs under the header (`section-tabs.tsx`).
 * URLs don't depend on this: it only decides what the nav calls things.
 */
export type NavLink = { href: string; label: string };
export type NavSection = NavLink & {
  tabs?: readonly NavLink[];
  /** Other paths that count as this section, with no tab of their own. */
  also?: readonly string[];
};

export const NAV_SECTIONS: readonly NavSection[] = [
  {
    href: "/browse",
    label: "Listen",
    also: ["/player"],
    tabs: [
      { href: "/browse", label: "Interviews" },
      { href: "/paths", label: "Paths" },
    ],
  },
  {
    href: "/timeline",
    label: "Explore",
    tabs: [
      { href: "/timeline", label: "Timeline" },
      { href: "/map", label: "Map" },
      { href: "/places", label: "Places" },
    ],
  },
  { href: "/portal", label: "Ask" },
  {
    href: "/about",
    label: "About",
    tabs: [
      { href: "/about", label: "The project" },
      { href: "/contact", label: "Contact" },
    ],
  },
];

const within = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

export function activeSection(pathname: string): NavSection | null {
  return (
    NAV_SECTIONS.find((s) =>
      [s.href, ...(s.tabs ?? []).map((t) => t.href), ...(s.also ?? [])].some((h) => within(pathname, h)),
    ) ?? null
  );
}

/** The tab row for a page, or null when the page isn't one of the tabs. */
export function sectionTabs(pathname: string): { section: NavSection; tabs: readonly NavLink[]; active: NavLink } | null {
  const section = activeSection(pathname);
  const active = section?.tabs?.find((t) => within(pathname, t.href));
  return section?.tabs && active ? { section, tabs: section.tabs, active } : null;
}
