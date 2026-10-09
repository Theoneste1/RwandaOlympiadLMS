import Link from "next/link";
import { Container } from "@/components/container";
import { SITE } from "@/lib/site-config";

// The root not-found.tsx renders for any URL that matches no route at all,
// so it sits outside the (marketing)/(app) route groups and can't rely on
// their layouts for a header — hence the small inline one below.
export default function NotFound() {
  return (
    <>
      <header className="border-b border-border">
        <Container className="flex h-16 items-center">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-brand-foreground text-sm">
              RO
            </span>
            <span>{SITE.shortName}</span>
          </Link>
        </Container>
      </header>

      <Container className="flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">404</p>
        <h1 className="mt-2 font-serif text-4xl font-normal tracking-tight sm:text-5xl">Page not found</h1>
        <p className="mt-3 max-w-md text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center rounded-md bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground hover:bg-brand-dark"
          >
            Back to Home
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center rounded-md border border-border px-6 py-3 text-sm font-semibold hover:bg-muted"
          >
            Contact Us
          </Link>
        </div>
      </Container>
    </>
  );
}
