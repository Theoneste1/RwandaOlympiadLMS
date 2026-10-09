import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell, AuthGate } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { effectiveAssignmentStatus } from "@/lib/insights";

export const metadata: Metadata = { title: "Classwork" };

export default async function StudentClassworkPage() {
  const session = await getSession();
  if (!session || session.role !== "STUDENT") redirect("/login");

  const enrollments = await prisma.classEnrollment.findMany({
    where: { studentId: session.userId },
    include: {
      class: {
        include: {
          content: { where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" } },
          assignments: {
            where: { status: { in: ["PUBLISHED", "ARCHIVED"] } },
            include: { submissions: { where: { studentId: session.userId } } },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
    orderBy: { enrolledAt: "asc" },
  });

  const hasAnything = enrollments.some(({ class: c }) => c.content.length > 0 || c.assignments.length > 0);

  return (
    <AuthGate role="student">
      <AppShell role="student">
        <div className="lms-page space-y-6 p-1">
          <section className="lms-banner">
            <div>
              <p className="lms-banner-kicker">Classwork</p>
              <h1>Classwork</h1>
              <p>Materials and assignments across all of your classes.</p>
            </div>
          </section>

          {!hasAnything ? (
            <div className="lms-empty">Nothing published yet across your classes. Check back soon.</div>
          ) : (
            <div className="space-y-6">
              {enrollments.map(({ class: c }) => {
                if (c.content.length === 0 && c.assignments.length === 0) return null;
                return (
                  <div key={c.id} className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="lms-panel-title">{c.name}</h2>
                      <Link href={`/student/classes/${c.id}`} className="text-sm font-semibold text-brand hover:underline">Open class →</Link>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {c.assignments.map((a) => (
                        <Link key={a.id} href={`/student/assignments/${a.id}`} className="lms-panel hover:border-sky-200">
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Assignment</p>
                          <p className="lms-panel-title mt-1">{a.title}</p>
                          <div className="mt-2"><StatusBadge status={effectiveAssignmentStatus(a.submissions[0]?.status, a.dueAt)} /></div>
                        </Link>
                      ))}
                      {c.content.map((item) => (
                        <Link key={item.id} href={`/student/content/${item.id}`} className="lms-panel hover:border-sky-200">
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{item.type.replace("_", " ")}</p>
                          <p className="lms-panel-title mt-1">{item.title}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </AppShell>
    </AuthGate>
  );
}
