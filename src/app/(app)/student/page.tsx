import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell, AuthGate } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { currentStreakDays, effectiveAssignmentStatus, formatTopicLabel, topicMasteryFromAttempts } from "@/lib/insights";

export const metadata: Metadata = { title: "Student Dashboard" };

export default async function StudentDashboardPage() {
  const session = await getSession();
  if (!session || session.role !== "STUDENT") redirect("/login");

  const [enrollments, assignments, attempts, recentContent] = await Promise.all([
    prisma.classEnrollment.findMany({
      where: { studentId: session.userId },
      include: { class: { include: { teacher: true, enrollments: true } } },
      orderBy: { enrolledAt: "asc" },
    }),
    prisma.assignment.findMany({
      where: { status: "PUBLISHED", class: { enrollments: { some: { studentId: session.userId } } } },
      include: { submissions: { where: { studentId: session.userId } }, class: true },
      orderBy: { dueAt: "asc" },
    }),
    prisma.examAttempt.findMany({
      where: { status: "SUBMITTED", registration: { studentId: session.userId } },
      include: { registration: { include: { competition: true } } },
      orderBy: { submittedAt: "desc" },
    }),
    prisma.content.findMany({
      where: { status: "PUBLISHED", class: { enrollments: { some: { studentId: session.userId } } } },
      orderBy: { publishedAt: "desc" },
      take: 3,
      include: { class: true },
    }),
  ]);

  const continueAssignment = assignments.find((a) => a.submissions[0]?.status === "IN_PROGRESS");

  const withStatus = assignments.map((a) => ({ a, status: effectiveAssignmentStatus(a.submissions[0]?.status, a.dueAt) }));
  const overdue = withStatus.filter((x) => x.status === "OVERDUE");
  const dueSoon = withStatus
    .filter((x) => x.status === "NOT_STARTED" || x.status === "RESUBMISSION_REQUIRED")
    .slice(0, 3);

  const gradedSubmissions = assignments
    .map((a) => a.submissions[0])
    .filter((s): s is NonNullable<typeof s> => Boolean(s) && s!.status === "GRADED" && s!.score != null && !!s!.maxScore);
  const averageScore = gradedSubmissions.length
    ? Math.round(gradedSubmissions.reduce((sum, s) => sum + (s.score! / s.maxScore!) * 100, 0) / gradedSubmissions.length)
    : null;

  const submittedCount = assignments.filter((a) => a.submissions[0] && a.submissions[0].status !== "IN_PROGRESS").length;
  const completionRate = assignments.length ? Math.round((submittedCount / assignments.length) * 100) : null;

  const topicMastery = topicMasteryFromAttempts(
    attempts.map((a) => ({ score: a.score, totalPoints: a.totalPoints, topic: a.registration.competition.topic })),
  );
  const weakestTopic = topicMastery.filter((t) => t.percentage < 70).pop();

  const streak = currentStreakDays([
    ...assignments.map((a) => a.submissions[0]?.submittedAt).filter((d): d is Date => Boolean(d)),
    ...attempts.map((a) => a.submittedAt).filter((d): d is Date => Boolean(d)),
  ]);

  return (
    <AuthGate role="student">
      <AppShell role="student">
        <div className="space-y-6">
          <section className="rounded-[2rem] bg-gradient-to-r from-sky-950 via-sky-900 to-indigo-900 p-6 text-white shadow-xl sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-sky-200">Student portal</p>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl">Good morning, {session.name.split(" ")[0]}</h1>
            <p className="mt-2 max-w-xl text-sm text-sky-100/80">Learn → Practice → Get feedback → Improve → Compete → Progress.</p>
          </section>

          <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black text-slate-900">Continue Learning</h2>
              {continueAssignment ? (
                <Link href={`/student/assignments/${continueAssignment.id}`} className="mt-4 block rounded-2xl border border-sky-200 bg-sky-50 p-4 hover:bg-sky-100">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-700">In progress</p>
                  <p className="mt-1 text-lg font-black text-slate-900">{continueAssignment.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{continueAssignment.class.name} — pick up where you left off</p>
                </Link>
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  Nothing in progress right now. <Link href="/student/classwork" className="font-semibold text-sky-700 hover:underline">Browse classwork</Link> to get started.
                </p>
              )}

              {weakestTopic && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-700">Recommended for you</p>
                  <p className="mt-1 font-black text-slate-900">{formatTopicLabel(weakestTopic.topic)} — you&apos;re at {weakestTopic.percentage}%</p>
                  <p className="mt-1 text-sm text-slate-600">This is your lowest-scoring topic so far. Review it and look out for your coach&apos;s next {formatTopicLabel(weakestTopic.topic).toLowerCase()} assignment.</p>
                  <Link href="/student/grades" className="mt-2 inline-flex text-sm font-semibold text-amber-800 hover:underline">See topic mastery →</Link>
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black text-slate-900">Your Progress</h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Average</p>
                  <p className="mt-1 text-2xl font-black text-slate-900">{averageScore != null ? `${averageScore}%` : "—"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Completion</p>
                  <p className="mt-1 text-2xl font-black text-slate-900">{completionRate != null ? `${completionRate}%` : "—"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Classes</p>
                  <p className="mt-1 text-2xl font-black text-slate-900">{enrollments.length}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Streak</p>
                  <p className="mt-1 text-2xl font-black text-slate-900">{streak > 0 ? `${streak}d` : "—"}</p>
                </div>
              </div>
              <Link href="/student/grades" className="mt-4 inline-flex text-sm font-semibold text-sky-700 hover:underline">View grades &amp; progress →</Link>
            </section>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-black text-slate-900">Your Tasks</h2>
                <Link href="/student/calendar" className="text-sm font-semibold text-sky-700 hover:underline">Full calendar →</Link>
              </div>

              {overdue.length === 0 && dueSoon.length === 0 ? (
                <p className="mt-5 text-sm text-slate-500">Nothing due — you&apos;re all caught up.</p>
              ) : (
                <div className="mt-5 space-y-3">
                  {overdue.map(({ a }) => (
                    <Link key={a.id} href={`/student/assignments/${a.id}`} className="block rounded-2xl border border-red-200 bg-red-50 p-4 hover:bg-red-100">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-slate-900">{a.title}</p>
                          <p className="mt-1 text-sm text-slate-500">{a.class.name}</p>
                        </div>
                        <StatusBadge status="OVERDUE" />
                      </div>
                    </Link>
                  ))}
                  {dueSoon.map(({ a }) => (
                    <Link key={a.id} href={`/student/assignments/${a.id}`} className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:border-sky-200 hover:bg-sky-50">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-slate-900">{a.title}</p>
                          <p className="mt-1 text-sm text-slate-500">{a.class.name}</p>
                        </div>
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
                          {a.dueAt ? a.dueAt.toLocaleDateString() : "No due date"}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-black text-slate-900">Recent Results</h2>
                <Link href="/results" className="text-sm font-semibold text-sky-700 hover:underline">View all</Link>
              </div>
              {attempts.length === 0 ? (
                <p className="mt-5 text-sm text-slate-500">No completed exams yet.</p>
              ) : (
                <div className="mt-5 space-y-3">
                  {attempts.slice(0, 3).map((attempt) => (
                    <Link key={attempt.id} href={`/results/${attempt.id}`} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 hover:border-sky-200 hover:bg-sky-50">
                      <span className="font-semibold text-slate-700">{attempt.registration.competition.name}</span>
                      <span className="text-sm font-black text-sky-700">{attempt.score}/{attempt.totalPoints}</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-black text-slate-900">New in Resources</h2>
              <Link href="/student/resources" className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 hover:text-sky-700">All resources</Link>
            </div>

            {recentContent.length === 0 ? (
              <p className="mt-5 text-sm text-slate-500">Nothing published yet — check back soon.</p>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {recentContent.map((resource) => (
                  <Link key={resource.id} href={`/student/content/${resource.id}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:border-sky-200 hover:bg-sky-50">
                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-sky-700">{resource.type.replace("_", " ")}</p>
                    <h3 className="mt-2 text-lg font-black text-slate-900">{resource.title}</h3>
                    <p className="mt-2 text-sm text-slate-600">{resource.class.name}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </AppShell>
    </AuthGate>
  );
}
