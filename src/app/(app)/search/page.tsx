import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell, AuthGate } from "@/components/app-shell";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Search" };

type Result = { id: string; kind: string; title: string; subtitle: string; href: string };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = session.role === "TEACHER" ? "teacher" : "student";

  const { q } = await searchParams;
  const query = (q ?? "").trim();
  let results: Result[] = [];

  if (query) {
    if (role === "teacher") {
      const [classes, content, assignments] = await Promise.all([
        prisma.class.findMany({ where: { teacherId: session.userId, name: { contains: query } } }),
        prisma.content.findMany({ where: { class: { teacherId: session.userId }, title: { contains: query } }, include: { class: true } }),
        prisma.assignment.findMany({ where: { class: { teacherId: session.userId }, title: { contains: query } }, include: { class: true } }),
      ]);
      results = [
        ...classes.map((c) => ({ id: c.id, kind: "Class", title: c.name, subtitle: c.subject, href: `/teacher/classes/${c.id}` })),
        ...content.map((c) => ({ id: c.id, kind: "Content", title: c.title, subtitle: c.class.name, href: `/teacher/content/${c.id}` })),
        ...assignments.map((a) => ({ id: a.id, kind: "Assignment", title: a.title, subtitle: a.class.name, href: `/teacher/assignments/${a.id}` })),
      ];
    } else {
      const [classes, content, assignments] = await Promise.all([
        prisma.class.findMany({ where: { enrollments: { some: { studentId: session.userId } }, name: { contains: query } } }),
        prisma.content.findMany({
          where: { status: "PUBLISHED", class: { enrollments: { some: { studentId: session.userId } } }, title: { contains: query } },
          include: { class: true },
        }),
        prisma.assignment.findMany({
          where: { status: { in: ["PUBLISHED", "ARCHIVED"] }, class: { enrollments: { some: { studentId: session.userId } } }, title: { contains: query } },
          include: { class: true },
        }),
      ]);
      results = [
        ...classes.map((c) => ({ id: c.id, kind: "Class", title: c.name, subtitle: c.subject, href: `/student/classes/${c.id}` })),
        ...content.map((c) => ({ id: c.id, kind: "Content", title: c.title, subtitle: c.class.name, href: `/student/content/${c.id}` })),
        ...assignments.map((a) => ({ id: a.id, kind: "Assignment", title: a.title, subtitle: a.class.name, href: `/student/assignments/${a.id}` })),
      ];
    }
  }

  return (
    <AuthGate role={role}>
      <AppShell role={role}>
        <div className="lms-page space-y-6 p-1">
          <section className="lms-banner">
            <div>
              <p className="lms-banner-kicker">Search</p>
              <h1>Search</h1>
              <p>Classes, assignments, and content you have access to.</p>
            </div>
          </section>

          <form className="flex gap-2">
            <label className="sr-only" htmlFor="search-q">Search</label>
            <input id="search-q" type="search" name="q" defaultValue={query} placeholder="Search classes, assignments, content…" className="w-full max-w-md rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100" />
            <button type="submit" className="lms-btn lms-btn-primary">Search</button>
            {query && <Link href="/search" className="lms-btn lms-btn-ghost">Clear</Link>}
          </form>

          {!query ? (
            <div className="lms-empty">Start typing to search.</div>
          ) : results.length === 0 ? (
            <div className="lms-empty">No results for &quot;{query}&quot;.</div>
          ) : (
            <div className="space-y-2">
              {results.map((result) => (
                <Link key={`${result.kind}-${result.id}`} href={result.href} className="lms-panel flex items-center justify-between gap-3 hover:border-sky-200">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{result.kind}</p>
                    <p className="lms-panel-title">{result.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{result.subtitle}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </AppShell>
    </AuthGate>
  );
}
