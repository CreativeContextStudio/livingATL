"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuIcon, XIcon } from "lucide-react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";

import { cn } from "@/lib/utils";

export type MobileNavLink = { href: string; label: string };

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Compact hamburger → side-sheet nav used below the `md` breakpoint. The
 * desktop `<nav>` in `SiteHeader` stays untouched above `md`; this renders
 * only when both (a) the viewport is narrow and (b) the launch gate is on
 * (SiteHeader controls the second condition by only mounting this
 * component when launch is enabled, matching the existing desktop nav).
 *
 * Base UI handles focus trap, Escape-to-close, and scroll lock while open.
 * Each link is wrapped in `Dialog.Close` so tapping one both navigates and
 * dismisses the sheet.
 */
export function MobileNavSheet({ links }: { links: readonly MobileNavLink[] }) {
  const pathname = usePathname() ?? "/";

  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger
        aria-label="Open menu"
        className="inline-flex h-11 w-11 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <MenuIcon className="size-5" aria-hidden="true" />
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className="fixed inset-0 z-50 bg-black/20 supports-backdrop-filter:backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
        />
        <DialogPrimitive.Popup
          className="fixed inset-y-0 right-0 z-50 flex h-dvh w-[85vw] max-w-xs flex-col gap-2 border-l border-border bg-background p-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-xl outline-none data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right"
        >
          <div className="flex items-center justify-between">
            <DialogPrimitive.Title className="font-heading text-lg font-bold tracking-tight">
              living<span className="text-primary">ATL</span>
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Close menu"
              className="inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <XIcon className="size-5" aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>

          <DialogPrimitive.Description className="sr-only">
            Site navigation
          </DialogPrimitive.Description>

          <nav aria-label="Primary" className="mt-4 flex flex-col">
            <ul className="flex flex-col gap-1">
              {links.map((link) => {
                const active = isActive(pathname, link.href);
                return (
                  <li key={link.href}>
                    <DialogPrimitive.Close
                      render={
                        <Link
                          href={link.href}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex min-h-12 items-center rounded-md px-3 font-mono text-sm tracking-[0.18em] uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            active
                              ? "bg-accent text-foreground"
                              : "text-muted-foreground hover:bg-accent hover:text-foreground",
                          )}
                        >
                          {link.label}
                        </Link>
                      }
                    />
                  </li>
                );
              })}
            </ul>
          </nav>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
