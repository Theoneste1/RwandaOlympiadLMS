import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell, AuthGate } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { effectiveAssignmentStatus } from "@/lib/insights";

export const metadata: Metadata = { title: "Class" };

const TABS = ["stream", "classwork", "people", "grades"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = { stream: "Stream", classwork: "Classwork", people: "People", grades: "Grades" };

export default async function StudentClassDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "STUDENT") redirect("/login");

  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const tab: Tab = TABS.includes(tabParam as Tab) ? (tabParam as Tab) : "stream";

  const enrollment = await prisma.classEnrollment.findUnique({
    where: { classId_studentId: { classId: id, studentId: session.userId } },
  });
  if (!enrollment) notFound();

  const classInfo = await prisma.class.findUnique({
    where: { id },
    include: {
      teacher: true,
      enrollments: { include: { student: true }, orderBy: { enrolledAt: "asc" } },
      content: { where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" } },
      assignments: {
        where: { status: { in: ["PUBLISHED", "ARCHIVED"] } },
        include: { submissions: { where: { studentId: session.userId } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!classInfo) notFound();

  const stream = [
    ...classInfo.content.map((c) => ({ id: c.id, kind: "content" as const, title: c.title, when: c.publishedAt ?? c.createdAt, href: `/student/content/${c.id}` })),
    ...classInfo.assignments.map((a) => ({ id: a.id, kind: "assignment" as const, title: a.title, when: a.publishedAt ?? a.createdAt, href: `/student/assignments/${a.id}` })),
  ].sort((a, b) => b.when.getTime() - a.when.getTime());

  return (
    <AuthGate role="student">
      <AppShell role="student">
        <div className="lms-page space-y-6 p-1">
          <section className="lms-banner">
            <div>
              <p className="lms-banner-kicker">{classInfo.subject}</p>
              <h1>{classInfo.name}</h1>
              <p>Coach {classInfo.teacher.name} · {classInfo.enrollments.length} students</p>
            </div>
            <div className="lms-banner-actions">
              <Link href="/student/classes" className="lms-btn lms-btn-ghost">Back</Link>
            </div>
          </section>

          <div className="lms-filter-bar" aria-label="Class sections">
            {TABS.map((item) => (
              <Link key={item} href={`/student/classes/${id}?tab=${item}`} className={`lms-filter-chip ${tab === item ? "active" : ""}`}>
                {TAB_LABELS[item]}
              </Link>
            ))}
          </div>

          {tab === "stream" && (
            <div className="space-y-3">
              {stream.length === 0 ? (
                <div className="lms-empty">Nothing posted here yet.</div>
              ) : (
                stream.map((item) => (
                  <Link key={`${item.kind}-${item.id}`} href={item.href} className="lms-panel flex items-center justify-between gap-3 hover:border-sky-200">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{item.kind === "content" ? "Material" : "Assignment"}</p>
                      <p className="lms-panel-title">{item.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.when.toLocaleDateString()}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}

          {tab === "classwork" && (
            <div className="space-y-4">
              <div className="lms-panel-title">Materials</div>
              {classInfo.content.length === 0 ? (
                <div className="lms-empty">No materials yet.</div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {classInfo.content.map((c) => (
                    <Link key={c.id} href={`/student/content/${c.id}`} className="lms-panel hover:border-sky-200">
                      <p className="lms-panel-title">{c.title}</p>
                    </Link>
                  ))}
                </div>
              )}
              <div className="lms-panel-title">Assignments</div>
              {classInfo.assignments.length === 0 ? (
                <div className="lms-empty">No assignments yet.</div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {classInfo.assignments.map((a) => (
                    <Link key={a.id} href={`/student/assignments/${a.id}`} className="lms-panel hover:border-sky-200">
                      <p className="lms-panel-title">{a.title}</p>
                      <div className="mt-2">
                        <StatusBadge status={effectiveAssignmentStatus(a.submissions[0]?.status, a.dueAt)} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "people" && (
            <div className="space-y-4">
              <div className="lms-panel-title">Coach</div>
              <div className="lms-panel">{classInfo.teacher.name}</div>
              <div className="lms-panel-title">Students ({classInfo.enrollments.length})</div>
              <div className="lms-panel">
                {classInfo.enrollments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No students enrolled yet.</p>
                ) : (
                  <ul className="grid gap-2 text-sm">
                    {classInfo.enrollments.map((e) => <li key={e.id}>{e.student.name}</li>)}
                  </ul>
                )}
              </div>
            </div>
          )}

          {tab === "grades" && (
            classInfo.assignments.length === 0 ? (
              <div className="lms-empty">No graded assignments yet.</div>
            ) : (
              <div className="lms-table-wrap">
                <table className="lms-table">
                  <thead><tr><th>Assignment</th><th>Status</th><th>Score</th></tr></thead>
                  <tbody>
                    {classInfo.assignments.map((a) => {
                      const submission = a.submissions[0];
                      return (
                        <tr key={a.id}>
                          <td>{a.title}</td>
                          <td><StatusBadge status={effectiveAssignmentStatus(submission?.status, a.dueAt)} /></td>
                          <td className="font-bold">{submission?.status === "GRADED" ? `${submission.score}/${submission.maxScore}` : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </AppShell>
    </AuthGate>
  );
}
