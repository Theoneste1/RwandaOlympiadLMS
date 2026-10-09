import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell, AuthGate } from "@/components/app-shell";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Rankings" };

export default async function RankingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = session.role === "TEACHER" ? "teacher" : "student";

  const attempts = await prisma.examAttempt.findMany({
    where: { status: "SUBMITTED", totalPoints: { gt: 0 } },
    include: { registration: { include: { student: true, competition: true } } },
  });

  const overallByStudent = new Map<string, { name: string; totalScore: number; totalPoints: number; attempts: number }>();
  for (const attempt of attempts) {
    const studentId = attempt.registration.studentId;
    const entry = overallByStudent.get(studentId) ?? { name: attempt.registration.student.name, totalScore: 0, totalPoints: 0, attempts: 0 };
    entry.totalScore += attempt.score ?? 0;
    entry.totalPoints += attempt.totalPoints ?? 0;
    entry.attempts += 1;
    overallByStudent.set(studentId, entry);
  }
  const overallRanking = Array.from(overallByStudent.entries())
    .map(([studentId, entry]) => ({ studentId, ...entry, percentage: entry.totalPoints ? Math.round((entry.totalScore / entry.totalPoints) * 100) : 0 }))
    .sort((a, b) => b.percentage - a.percentage);

  const byCompetition = new Map<string, { name: string; rows: { studentId: string; name: string; score: number; totalPoints: number }[] }>();
  for (const attempt of attempts) {
    const competitionId = attempt.registration.competitionId;
    const entry = byCompetition.get(competitionId) ?? { name: attempt.registration.competition.name, rows: [] };
    entry.rows.push({
      studentId: attempt.registration.studentId,
      name: attempt.registration.student.name,
      score: attempt.score ?? 0,
      totalPoints: attempt.totalPoints ?? 0,
    });
    byCompetition.set(competitionId, entry);
  }
  for (const entry of byCompetition.values()) {
    entry.rows.sort((a, b) => b.score - a.score);
  }

  return (
    <AuthGate role={role}>
      <AppShell role={role}>
        <div className="lms-page space-y-6 p-1">
          <section className="lms-banner">
            <div>
              <p className="lms-banner-kicker">Rankings</p>
              <h1>Leaderboards</h1>
              <p>Ranked by completed Olympiad exam scores.</p>
            </div>
          </section>

          <div className="lms-notice-banner lms-notice-info">
            School and province rankings aren&apos;t available yet — the platform doesn&apos;t have a school/province data model.
            This view ranks every student who has completed at least one exam.
          </div>

          <div className="space-y-2">
            <p className="lms-panel-title">Overall ranking</p>
            {overallRanking.length === 0 ? (
              <div className="lms-empty">No completed exams yet — rankings will appear once students submit exams.</div>
            ) : (
              <div className="lms-table-wrap">
                <table className="lms-table">
                  <thead><tr><th>Rank</th><th>Student</th><th>Exams completed</th><th>Average</th></tr></thead>
                  <tbody>
                    {overallRanking.map((row, index) => (
                      <tr key={row.studentId} className={row.studentId === session.userId ? "font-bold" : undefined}>
                        <td>#{index + 1}</td>
                        <td>{row.name}{row.studentId === session.userId ? " (you)" : ""}</td>
                        <td>{row.attempts}</td>
                        <td>{row.percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {Array.from(byCompetition.entries()).map(([competitionId, entry]) => (
            <div key={competitionId} className="space-y-2">
              <p className="lms-panel-title">{entry.name}</p>
              <div className="lms-table-wrap">
                <table className="lms-table">
                  <thead><tr><th>Rank</th><th>Student</th><th>Score</th></tr></thead>
                  <tbody>
                    {entry.rows.map((row, index) => (
                      <tr key={`${competitionId}-${row.studentId}`} className={row.studentId === session.userId ? "font-bold" : undefined}>
                        <td>#{index + 1}</td>
                        <td>{row.name}{row.studentId === session.userId ? " (you)" : ""}</td>
                        <td>{row.score}/{row.totalPoints}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </AppShell>
    </AuthGate>
  );
}
