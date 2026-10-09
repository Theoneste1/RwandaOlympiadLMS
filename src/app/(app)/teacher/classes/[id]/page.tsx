import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell, AuthGate } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { EnrollForm, UnenrollButton } from "@/components/class-roster-manager";
import { latestSubmissionByStudent } from "@/lib/assignments";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Class" };

const TABS = ["stream", "classwork", "people", "grades"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = { stream: "Stream", classwork: "Classwork", people: "People", grades: "Grades" };

export default async function TeacherClassDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") redirect("/login");

  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const tab: Tab = TABS.includes(tabParam as Tab) ? (tabParam as Tab) : "stream";

  const classInfo = await prisma.class.findUnique({
    where: { id },
    include: {
      enrollments: { include: { student: true }, orderBy: { enrolledAt: "asc" } },
      content: { orderBy: { createdAt: "desc" } },
      assignments: { include: { submissions: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!classInfo || classInfo.teacherId !== session.userId) notFound();

  const availableStudents = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      managedById: session.userId,
      id: { notIn: classInfo.enrollments.map((e) => e.studentId) },
    },
    orderBy: { name: "asc" },
  });

  const stream = [
    ...classInfo.content.map((c) => ({ id: c.id, kind: "content" as const, title: c.title, status: c.status, when: c.createdAt, href: `/teacher/content/${c.id}` })),
    ...classInfo.assignments.map((a) => ({ id: a.id, kind: "assignment" as const, title: a.title, status: a.status, when: a.createdAt, href: `/teacher/assignments/${a.id}` })),
  ].sort((a, b) => b.when.getTime() - a.when.getTime());

  return (
    <AuthGate role="teacher">
      <AppShell role="teacher">
        <div className="lms-page space-y-6 p-1">
          <section className="lms-banner">
            <div>
              <p className="lms-banner-kicker">{classInfo.subject}</p>
              <h1>{classInfo.name}</h1>
              <p>{classInfo.enrollments.length} student{classInfo.enrollments.length === 1 ? "" : "s"}</p>
            </div>
            <div className="lms-banner-actions">
              <Link href="/teacher/classes" className="lms-btn lms-btn-ghost">Back</Link>
            </div>
          </section>

          <div className="lms-filter-bar" aria-label="Class sections">
            {TABS.map((item) => (
              <Link key={item} href={`/teacher/classes/${id}?tab=${item}`} className={`lms-filter-chip ${tab === item ? "active" : ""}`}>
                {TAB_LABELS[item]}
              </Link>
            ))}
          </div>

          {tab === "stream" && (
            <div className="space-y-3">
              {stream.length === 0 ? (
                <div className="lms-empty">Nothing posted yet. Add content or create an assignment to get started.</div>
              ) : (
                stream.map((item) => (
                  <Link key={`${item.kind}-${item.id}`} href={item.href} className="lms-panel flex items-center justify-between gap-3 hover:border-sky-200">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{item.kind === "content" ? "Material" : "Assignment"}</p>
                      <p className="lms-panel-title">{item.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.when.toLocaleDateString()}</p>
                    </div>
                    <StatusBadge status={item.status} />
                  </Link>
                ))
              )}
            </div>
          )}

          {tab === "classwork" && (
            <div className="space-y-4">
              <div className="lms-banner-actions">
                <Link href="/teacher/content/new" className="lms-btn lms-btn-primary">Add material</Link>
                <Link href="/teacher/assignments/new" className="lms-btn lms-btn-ghost">Create assignment</Link>
              </div>
              <div className="lms-panel-title">Materials</div>
              {classInfo.content.length === 0 ? (
                <div className="lms-empty">No materials yet.</div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {classInfo.content.map((c) => (
                    <Link key={c.id} href={`/teacher/content/${c.id}`} className="lms-panel hover:border-sky-200">
                      <p className="lms-panel-title">{c.title}</p>
                      <div className="mt-2"><StatusBadge status={c.status} /></div>
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
                    <Link key={a.id} href={`/teacher/assignments/${a.id}`} className="lms-panel hover:border-sky-200">
                      <p className="lms-panel-title">{a.title}</p>
                      <div className="mt-2"><StatusBadge status={a.status} /></div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "people" && (
            <div className="space-y-4">
              <div className="lms-panel-title">Coach</div>
              <div className="lms-panel">{session.name}</div>
              <div className="lms-panel-title">Students ({classInfo.enrollments.length})</div>
              <div className="lms-panel space-y-3">
                {classInfo.enrollments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No students enrolled yet.</p>
                ) : (
                  <ul className="grid gap-2">
                    {classInfo.enrollments.map((enrollment) => (
                      <li key={enrollment.id} className="flex items-center justify-between gap-3 text-sm">
                        <span>{enrollment.student.name}{enrollment.student.studentIdNumber ? ` · ${enrollment.student.studentIdNumber}` : ""}</span>
                        <UnenrollButton enrollmentId={enrollment.id} studentName={enrollment.student.name} />
                      </li>
                    ))}
                  </ul>
                )}
                {availableStudents.length > 0 ? (
                  <EnrollForm classId={classInfo.id} students={availableStudents.map((s) => ({ id: s.id, name: s.name }))} />
                ) : (
                  <p className="text-xs text-muted-foreground">
                    All of your students are already enrolled. Add more students from the <Link href="/teacher" className="font-semibold text-brand hover:underline">dashboard</Link>.
                  </p>
                )}
              </div>
            </div>
          )}

          {tab === "grades" && (() => {
            const published = classInfo.assignments.filter((a) => a.status === "PUBLISHED" || a.status === "ARCHIVED");
            if (classInfo.enrollments.length === 0 || published.length === 0) {
              return <div className="lms-empty">Grades will appear here once you have students enrolled and published assignments.</div>;
            }
            const rows = classInfo.enrollments
              .map((enrollment) => {
                const scores = published.map((a) => {
                  const latest = latestSubmissionByStudent(a.submissions).get(enrollment.studentId);
                  return latest?.status === "GRADED" ? latest : null;
                });
                const graded = scores.filter((s): s is NonNullable<typeof s> => Boolean(s) && s!.score != null && !!s!.maxScore);
                const avg = graded.length
                  ? Math.round(graded.reduce((sum, s) => sum + (s.score! / s.maxScore!) * 100, 0) / graded.length)
                  : null;
                return { enrollment, scores, avg };
              })
              .sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1));
            return (
              <div className="lms-table-wrap">
                <table className="lms-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Student</th>
                      {published.map((a) => <th key={a.id}>{a.title}</th>)}
                      <th>Average</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr key={row.enrollment.id}>
                        <td>{row.avg != null ? `#${index + 1}` : "—"}</td>
                        <td>{row.enrollment.student.name}</td>
                        {row.scores.map((s, i) => <td key={published[i].id}>{s ? `${s.score}/${s.maxScore}` : "—"}</td>)}
                        <td className="font-bold">{row.avg != null ? `${row.avg}%` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      </AppShell>
    </AuthGate>
  );
}
