"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Container } from "@/components/container";
import { NAV_LINKS, SITE } from "@/lib/site-config";
import { logoutAction } from "@/lib/actions/auth";
import type { SessionPayload } from "@/lib/auth";

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
}

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function AboutDropdown({ items }: { items: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isActive = useIsActive();
  const groupActive = items.some((c) => isActive(c.href));

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex items-center gap-1 ${groupActive ? "text-brand" : "text-foreground/80 hover:text-foreground"}`}
      >
        About
        <svg width="10" height="6" viewBox="0 0 10 6" className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-2 w-48 rounded-md border border-border bg-background py-1 shadow-lg">
          {items.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              onClick={() => setOpen(false)}
              className={`block px-4 py-2 text-sm ${isActive(child.href) ? "text-brand" : "text-foreground/80 hover:bg-muted"}`}
            >
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function SiteHeader({ session }: { session: SessionPayload | null }) {
  const [open, setOpen] = useState(false);
  const isActive = useIsActive();
  const dashboardHref = session?.role === "TEACHER" ? "/teacher" : "/student";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-brand-foreground text-sm">
            RO
          </span>
          <span className="hidden sm:inline">{SITE.shortName}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {NAV_LINKS.map((link) =>
            link.children ? (
              <AboutDropdown key="about" items={link.children} />
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className={isActive(link.href) ? "text-brand" : "text-foreground/80 hover:text-foreground"}
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {session ? (
            <>
              <span className="text-sm text-muted-foreground">Hi, {session.name.split(" ")[0]}</span>
              <Link
                href={dashboardHref}
                className={`text-sm font-semibold ${isActive(dashboardHref) ? "text-brand" : "text-foreground/80 hover:text-foreground"}`}
              >
                Dashboard
              </Link>
              <Link
                href="/account"
                className={`text-sm font-semibold ${isActive("/account") ? "text-brand" : "text-foreground/80 hover:text-foreground"}`}
              >
                My Account
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
                >
                  Log Out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-semibold text-foreground/80 hover:text-foreground">
                Log In
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center rounded-md bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground hover:bg-brand-dark"
              >
                Register
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border border-border"
        >
          <span className="sr-only">Toggle menu</span>
          {open ? <CloseIcon /> : <MenuIcon />}
        </button>
      </Container>

      {open && (
        <div id="mobile-menu" className="md:hidden border-t border-border bg-background">
          <Container className="flex flex-col gap-1 py-4">
            {NAV_LINKS.map((link) =>
              link.children ? (
                <div key="about">
                  <p className="px-2 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">About</p>
                  {link.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={() => setOpen(false)}
                      className={`block rounded-md px-4 py-2 text-sm font-medium hover:bg-muted ${isActive(child.href) ? "text-brand" : ""}`}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-md px-2 py-2 text-sm font-medium hover:bg-muted ${isActive(link.href) ? "text-brand" : ""}`}
                >
                  {link.label}
                </Link>
              ),
            )}
            <div className="mt-2 flex flex-wrap gap-2 border-t border-border pt-3">
              {session ? (
                <>
                  <Link
                    href={dashboardHref}
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-md border border-border px-3 py-2 text-center text-sm font-semibold"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/account"
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-md border border-border px-3 py-2 text-center text-sm font-semibold"
                  >
                    My Account
                  </Link>
                  <form action={logoutAction} className="flex-1">
                    <button
                      type="submit"
                      className="w-full rounded-md bg-brand px-3 py-2 text-center text-sm font-semibold text-brand-foreground"
                    >
                      Log Out
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-md border border-border px-3 py-2 text-center text-sm font-semibold"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-md bg-brand px-3 py-2 text-center text-sm font-semibold text-brand-foreground"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </Container>
        </div>
      )}
    </header>
  );
}
