import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell, AuthGate } from "@/components/app-shell";
import { latestSubmissionByStudent } from "@/lib/assignments";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Reports" };

function average(scores: { score: number | null; maxScore: number | null }[]) {
  const usable = scores.filter((s) => s.score != null && s.maxScore);
  if (usable.length === 0) return null;
  return Math.round(usable.reduce((sum, s) => sum + (s.score! / s.maxScore!) * 100, 0) / usable.length);
}

export default async function TeacherReportsPage() {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") redirect("/login");

  const [classes, registrations] = await Promise.all([
    prisma.class.findMany({
      where: { teacherId: session.userId },
      include: {
        enrollments: true,
        assignments: { where: { status: { in: ["PUBLISHED", "ARCHIVED"] } }, include: { submissions: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.registration.findMany({
      where: { assignedById: session.userId },
      include: { attempt: true, competition: true },
    }),
  ]);

  const classReports = classes.map((c) => {
    const totalSlots = c.assignments.length * c.enrollments.length;
    const latestPerAssignment = c.assignments.map((a) => latestSubmissionByStudent(a.submissions));
    const submittedCount = c.enrollments.reduce(
      (sum, e) => sum + latestPerAssignment.filter((m) => m.has(e.studentId) && m.get(e.studentId)!.status !== "IN_PROGRESS").length,
      0,
    );
    const allSubmissions = c.assignments.flatMap((a) => a.submissions.filter((s) => s.status === "GRADED"));
    return {
      id: c.id,
      name: c.name,
      students: c.enrollments.length,
      assignments: c.assignments.length,
      completionRate: totalSlots ? Math.round((submittedCount / totalSlots) * 100) : null,
      average: average(allSubmissions),
    };
  });

  const completedAttempts = registrations.filter((r) => r.attempt?.status === "SUBMITTED");
  const examAverage = average(completedAttempts.map((r) => ({ score: r.attempt!.score, maxScore: r.attempt!.totalPoints })));
  const competitionBreakdown = new Map<string, { name: string; attempts: number; average: number | null }>();
  for (const r of completedAttempts) {
    const entry = competitionBreakdown.get(r.competitionId) ?? { name: r.competition.name, attempts: 0, average: null };
    entry.attempts += 1;
    competitionBreakdown.set(r.competitionId, entry);
  }
  for (const [id, entry] of competitionBreakdown) {
    const attemptsForComp = completedAttempts.filter((r) => r.competitionId === id);
    entry.average = average(attemptsForComp.map((r) => ({ score: r.attempt!.score, maxScore: r.attempt!.totalPoints })));
  }

  const overallClassAverage = average(classes.flatMap((c) => c.assignments.flatMap((a) => a.submissions.filter((s) => s.status === "GRADED"))));

  return (
    <AuthGate role="teacher">
      <AppShell role="teacher">
        <div className="lms-page space-y-6 p-1">
          <section className="lms-banner">
            <div>
              <p className="lms-banner-kicker">Reports</p>
              <h1>Reports &amp; Analytics</h1>
              <p>Assignment completion and exam performance across your classes.</p>
            </div>
          </section>

          <section className="lms-stat-grid">
            <div className="lms-stat"><span>Classes</span><strong>{classes.length}</strong></div>
            <div className="lms-stat"><span>Assignment average</span><strong>{overallClassAverage != null ? `${overallClassAverage}%` : "—"}</strong></div>
            <div className="lms-stat"><span>Exam average</span><strong>{examAverage != null ? `${examAverage}%` : "—"}</strong></div>
            <div className="lms-stat"><span>Exams completed</span><strong>{completedAttempts.length}</strong></div>
          </section>

          <div className="space-y-2">
            <p className="lms-panel-title">Class performance</p>
            {classReports.length === 0 ? (
              <div className="lms-empty">No classes yet.</div>
            ) : (
              <div className="lms-table-wrap">
                <table className="lms-table">
                  <thead><tr><th>Class</th><th>Students</th><th>Assignments</th><th>Completion rate</th><th>Average score</th></tr></thead>
                  <tbody>
                    {classReports.map((c) => (
                      <tr key={c.id}>
                        <td>{c.name}</td>
                        <td>{c.students}</td>
                        <td>{c.assignments}</td>
                        <td>{c.completionRate != null ? `${c.completionRate}%` : "—"}</td>
                        <td className="font-bold">{c.average != null ? `${c.average}%` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="lms-panel-title">Competition performance</p>
            {competitionBreakdown.size === 0 ? (
              <div className="lms-empty">No completed exam attempts yet.</div>
            ) : (
              <div className="lms-table-wrap">
                <table className="lms-table">
                  <thead><tr><th>Competition</th><th>Completed attempts</th><th>Average score</th></tr></thead>
                  <tbody>
                    {Array.from(competitionBreakdown.values()).map((entry) => (
                      <tr key={entry.name}>
                        <td>{entry.name}</td>
                        <td>{entry.attempts}</td>
                        <td className="font-bold">{entry.average != null ? `${entry.average}%` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </AppShell>
    </AuthGate>
  );
}
