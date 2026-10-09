import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell, AuthGate } from "@/components/app-shell";
import { latestSubmissionByStudent } from "@/lib/assignments";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Gradebook" };

export default async function TeacherGradesPage({ searchParams }: { searchParams: Promise<{ classId?: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") redirect("/login");

  const classes = await prisma.class.findMany({
    where: { teacherId: session.userId },
    include: {
      enrollments: { include: { student: true }, orderBy: { enrolledAt: "asc" } },
      assignments: { where: { status: { in: ["PUBLISHED", "ARCHIVED"] } }, include: { submissions: true }, orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "asc" },
  });

  const { classId } = await searchParams;
  const activeClass = classes.find((c) => c.id === classId) ?? classes[0];

  return (
    <AuthGate role="teacher">
      <AppShell role="teacher">
        <div className="lms-page space-y-6 p-1">
          <section className="lms-banner">
            <div>
              <p className="lms-banner-kicker">Gradebook</p>
              <h1>Gradebook</h1>
              <p>Assignment scores for every student, by class.</p>
            </div>
          </section>

          {classes.length === 0 ? (
            <div className="lms-empty">
              <p>You don&apos;t have any classes yet.</p>
              <Link href="/teacher/my-classes" className="lms-btn lms-btn-primary mt-4 inline-flex">Create your first class</Link>
            </div>
          ) : (
            <>
              <div className="lms-filter-bar" aria-label="Choose a class">
                {classes.map((c) => (
                  <Link key={c.id} href={`/teacher/grades?classId=${c.id}`} className={`lms-filter-chip ${activeClass?.id === c.id ? "active" : ""}`}>
                    {c.name}
                  </Link>
                ))}
              </div>

              {!activeClass || activeClass.enrollments.length === 0 ? (
                <div className="lms-empty">No students enrolled in this class yet.</div>
              ) : activeClass.assignments.length === 0 ? (
                <div className="lms-empty">No published assignments in this class yet.</div>
              ) : (
                <div className="lms-table-wrap">
                  <table className="lms-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        {activeClass.assignments.map((a) => <th key={a.id}>{a.title}</th>)}
                        <th>Average</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeClass.enrollments.map((enrollment) => {
                        const scores = activeClass.assignments.map((a) => latestSubmissionByStudent(a.submissions).get(enrollment.studentId));
                        const graded = scores.filter((s): s is NonNullable<typeof s> => Boolean(s) && s!.status === "GRADED" && s!.score != null && !!s!.maxScore);
                        const avg = graded.length
                          ? Math.round(graded.reduce((sum, s) => sum + (s.score! / s.maxScore!) * 100, 0) / graded.length)
                          : null;
                        return (
                          <tr key={enrollment.id}>
                            <td>{enrollment.student.name}</td>
                            {scores.map((s, i) => (
                              <td key={activeClass.assignments[i].id}>
                                {s?.status === "GRADED" ? `${s.score}/${s.maxScore}` : s ? "—" : "Not assigned"}
                              </td>
                            ))}
                            <td className="font-bold">{avg != null ? `${avg}%` : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </AppShell>
    </AuthGate>
  );
}
