import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell, AuthGate } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { effectiveAssignmentStatus, formatTopicLabel, topicMasteryFromAttempts } from "@/lib/insights";

export const metadata: Metadata = { title: "Grades & Progress" };

export default async function StudentGradesPage() {
  const session = await getSession();
  if (!session || session.role !== "STUDENT") redirect("/login");

  const [enrollments, examAttempts] = await Promise.all([
    prisma.classEnrollment.findMany({
      where: { studentId: session.userId },
      include: {
        class: {
          include: {
            assignments: {
              where: { status: { in: ["PUBLISHED", "ARCHIVED"] } },
              include: { submissions: { where: { studentId: session.userId } } },
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
      orderBy: { enrolledAt: "asc" },
    }),
    prisma.examAttempt.findMany({
      where: { status: "SUBMITTED", registration: { studentId: session.userId } },
      include: { registration: { include: { competition: true } } },
      orderBy: { submittedAt: "desc" },
    }),
  ]);

  // Rank each completed exam against everyone else who has completed the same competition.
  const competitionIds = examAttempts.map((a) => a.registration.competitionId);
  const peerAttempts = competitionIds.length
    ? await prisma.examAttempt.findMany({
        where: { status: "SUBMITTED", registration: { competitionId: { in: competitionIds } } },
        select: { score: true, registration: { select: { competitionId: true, studentId: true } } },
      })
    : [];
  const rankFor = (competitionId: string, score: number | null) => {
    const peers = peerAttempts.filter((p) => p.registration.competitionId === competitionId);
    const better = peers.filter((p) => (p.score ?? 0) > (score ?? 0)).length;
    return { rank: better + 1, outOf: peers.length };
  };

  const allGraded = enrollments
    .flatMap((e) => e.class.assignments.map((a) => a.submissions[0]))
    .filter((s): s is NonNullable<typeof s> => Boolean(s) && s!.status === "GRADED" && s!.score != null && !!s!.maxScore);
  const overallAverage = allGraded.length
    ? Math.round(allGraded.reduce((sum, s) => sum + (s.score! / s.maxScore!) * 100, 0) / allGraded.length)
    : null;

  const topicMastery = topicMasteryFromAttempts(
    examAttempts.map((a) => ({ score: a.score, totalPoints: a.totalPoints, topic: a.registration.competition.topic })),
  );

  const problemsAnswered = allGraded.length + examAttempts.reduce((sum, a) => sum + (a.totalPoints ? 1 : 0), 0);
  const achievements = [
    { earned: allGraded.length + examAttempts.length >= 1, label: "First assignment or exam completed" },
    { earned: problemsAnswered >= 10, label: "10 problems answered" },
    { earned: problemsAnswered >= 50, label: "50 problems answered" },
    { earned: examAttempts.some((a) => a.totalPoints && a.score === a.totalPoints), label: "Perfect score on an exam" },
    { earned: examAttempts.length >= 1, label: "Competition participant" },
    { earned: topicMastery.some((t) => t.percentage >= 85), label: "Topic mastery — 85%+ in a subject" },
  ].filter((a) => a.earned);

  return (
    <AuthGate role="student">
      <AppShell role="student">
        <div className="lms-page space-y-6 p-1">
          <section className="lms-banner">
            <div>
              <p className="lms-banner-kicker">Grades &amp; Progress</p>
              <h1>Grades &amp; Progress</h1>
              <p>Assignment scores, topic mastery, and your Olympiad competition history.</p>
            </div>
            <div className="lms-banner-actions">
              <div className="lms-stat" style={{ minWidth: "8rem" }}>
                <span>Overall average</span>
                <strong>{overallAverage != null ? `${overallAverage}%` : "—"}</strong>
              </div>
            </div>
          </section>

          <div className="space-y-2">
            <p className="lms-panel-title">Topic mastery</p>
            {topicMastery.length === 0 ? (
              <div className="lms-empty">Complete an Olympiad exam to see topic mastery here.</div>
            ) : (
              <div className="lms-panel space-y-3">
                {topicMastery.map((t) => (
                  <div key={t.topic}>
                    <div className="mb-1 flex items-center justify-between text-sm font-semibold text-slate-600">
                      <span>{formatTopicLabel(t.topic)}</span>
                      <span>{t.percentage}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full ${t.percentage >= 70 ? "bg-emerald-600" : t.percentage >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${t.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {enrollments.every((e) => e.class.assignments.length === 0) ? null : enrollments.map(({ class: c }) => {
            if (c.assignments.length === 0) return null;
            return (
              <div key={c.id} className="space-y-2">
                <p className="lms-panel-title">{c.name}</p>
                <div className="lms-table-wrap">
                  <table className="lms-table">
                    <thead><tr><th>Assignment</th><th>Status</th><th>Score</th></tr></thead>
                    <tbody>
                      {c.assignments.map((a) => {
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
              </div>
            );
          })}

          <div className="space-y-2">
            <p className="lms-panel-title">Competition history</p>
            {examAttempts.length === 0 ? (
              <div className="lms-empty">No completed exams yet.</div>
            ) : (
              <div className="lms-table-wrap">
                <table className="lms-table">
                  <thead><tr><th>Competition</th><th>Date</th><th>Score</th><th>Rank</th></tr></thead>
                  <tbody>
                    {examAttempts.map((attempt) => {
                      const { rank, outOf } = rankFor(attempt.registration.competitionId, attempt.score);
                      return (
                        <tr key={attempt.id}>
                          <td>{attempt.registration.competition.name}</td>
                          <td>{attempt.submittedAt?.toLocaleDateString() ?? "—"}</td>
                          <td className="font-bold">{attempt.score}/{attempt.totalPoints}</td>
                          <td>#{rank} of {outOf}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="lms-panel-title">Achievements</p>
            {achievements.length === 0 ? (
              <div className="lms-empty">Complete your first assignment or exam to start earning achievements.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {achievements.map((a) => (
                  <span key={a.label} className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-800">
                    {a.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </AppShell>
    </AuthGate>
  );
}
