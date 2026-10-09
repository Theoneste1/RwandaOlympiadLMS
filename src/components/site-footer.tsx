import Link from "next/link";
import { Container } from "@/components/container";
import { NAV_LINKS, SITE } from "@/lib/site-config";

const FOOTER_LINKS = NAV_LINKS.flatMap((link) => (link.children ? link.children : [link]));

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-muted">
      <Container className="grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-bold">{SITE.name}</p>
          <p className="mt-2 text-sm text-muted-foreground">{SITE.tagline}</p>
        </div>

        <div>
          <p className="text-sm font-semibold">Explore</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {FOOTER_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-foreground">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold">Account</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link href="/login" className="hover:text-foreground">Log In</Link>
            </li>
            <li>
              <Link href="/register" className="hover:text-foreground">Register</Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold">Contact</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>{SITE.address}</li>
            <li>{SITE.email}</li>
            <li>{SITE.phone}</li>
          </ul>
        </div>
      </Container>

      <div className="border-t border-border py-6">
        <Container className="flex flex-col items-center justify-between gap-2 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} {SITE.name}. All rights reserved.</p>
          <p>Placeholder content — site under active development.</p>
        </Container>
      </div>
    </footer>
  );
}
