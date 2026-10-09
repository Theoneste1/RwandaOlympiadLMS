import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell, AuthGate } from "@/components/app-shell";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Calendar" };

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

type Row = { key: string; title: string; subtitle: string; href: string; when: Date | null; done: boolean };

function Section({ title, items, tone }: { title: string; items: Row[]; tone: string }) {
  return (
    <div className="space-y-2">
      <p className="lms-panel-title">{title} ({items.length})</p>
      {items.length === 0 ? (
        <div className="lms-empty">Nothing here.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <Link key={item.key} href={item.href} className="lms-panel hover:border-sky-200">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="lms-panel-title">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.subtitle}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-bold ${tone}`}>
                  {item.when ? item.when.toLocaleDateString() : "No date"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default async function StudentCalendarPage() {
  const session = await getSession();
  if (!session || session.role !== "STUDENT") redirect("/login");

  const [assignments, registrations] = await Promise.all([
    prisma.assignment.findMany({
      where: { status: "PUBLISHED", dueAt: { not: null }, class: { enrollments: { some: { studentId: session.userId } } } },
      include: { submissions: { where: { studentId: session.userId } }, class: true },
      orderBy: { dueAt: "asc" },
    }),
    prisma.registration.findMany({
      where: { studentId: session.userId, status: { not: "COMPLETED" } },
      include: { competition: true },
    }),
  ]);

  const today = startOfToday();
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  const rows: Row[] = [
    ...assignments.map((a) => ({
      key: `a-${a.id}`,
      title: a.title,
      subtitle: a.class.name,
      href: `/student/assignments/${a.id}`,
      when: a.dueAt,
      done: a.submissions[0] ? a.submissions[0].status !== "IN_PROGRESS" : false,
    })),
    ...registrations.map((r) => ({
      key: `r-${r.id}`,
      title: r.competition.name,
      subtitle: `${r.competition.durationMinutes} min exam`,
      href: `/student/exams`,
      when: null,
      done: false,
    })),
  ];

  const overdue = rows.filter((r) => !r.done && r.when && r.when < today);
  const dueToday = rows.filter((r) => !r.done && r.when && r.when >= today && r.when < tomorrow);
  const upcoming = rows.filter((r) => !r.done && (!r.when || r.when >= tomorrow));
  const completed = rows.filter((r) => r.done);

  return (
    <AuthGate role="student">
      <AppShell role="student">
        <div className="lms-page space-y-6 p-1">
          <section className="lms-banner">
            <div>
              <p className="lms-banner-kicker">Calendar</p>
              <h1>Deadlines</h1>
              <p>Assignment due dates and assigned exams, at a glance.</p>
            </div>
          </section>

          <Section title="Overdue" items={overdue} tone="bg-red-100 text-red-700" />
          <Section title="Due today" items={dueToday} tone="bg-amber-100 text-amber-700" />
          <Section title="Upcoming" items={upcoming} tone="bg-sky-100 text-sky-700" />
          <Section title="Completed" items={completed} tone="bg-emerald-100 text-emerald-700" />
        </div>
      </AppShell>
    </AuthGate>
  );
}
