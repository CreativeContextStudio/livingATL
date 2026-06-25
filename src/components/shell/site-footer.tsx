import { FooterYear } from "./footer-year";

/**
 * Global footer rendered in `src/app/layout.tsx`. Sits in normal document
 * flow at the end of the body's flex column — `body` is `min-h-dvh
 * flex flex-col` and the main wrapper carries `flex-1`, so on short pages
 * the footer is pushed to the viewport bottom and on tall pages it lands
 * at the document end. Compact on mobile — tagline hides below sm to keep
 * the bar tight on small viewports.
 *
 * Previously this was `position: fixed` with `bottom-0`, which made the
 * footer behave like a persistent bar but caused full-page screenshots
 * (agent-browser --full resizes the viewport to document height before
 * snapping) to capture it stuck at viewport-relative bottom — i.e.
 * mid-document. Switching to flow positioning fixes the screenshot
 * artifact without changing the live UX meaningfully.
 *
 * Year renders via a tiny client island so statically-prerendered routes
 * (`/`, `/preview`, `/contact`) don't pin to the build year forever.
 */
export function SiteFooter() {
  return (
    <footer
      className="z-[var(--z-sticky)] w-full border-t-2 border-border bg-card/85 backdrop-blur pb-[env(safe-area-inset-bottom)]"
      style={{ height: "calc(var(--footer-h) + env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex h-[var(--footer-h)] w-full max-w-7xl items-center justify-between gap-3 px-6 text-[11px] text-muted-foreground sm:text-xs">
        <div className="flex min-w-0 items-center gap-3">
          <p className="font-heading text-sm font-bold tracking-tight text-foreground">
            living<span className="text-primary">ATL</span>
          </p>
          <p className="hidden truncate sm:block">
            An oral history archive of Atlanta, 1914–1977.
          </p>
        </div>
        <p className="font-mono tracking-[0.14em] uppercase whitespace-nowrap">
          <span className="hidden sm:inline">WRFG · Atlanta History Center · Creative Context Studio · </span><FooterYear />
        </p>
      </div>
    </footer>
  );
}
