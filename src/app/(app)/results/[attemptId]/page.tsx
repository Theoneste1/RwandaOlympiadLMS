import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { AppShell, AuthGate } from "@/components/app-shell";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Exam Result" };

export default async function ResultPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      registration: {
        include: {
          student: true,
          competition: { include: { questions: { orderBy: { order: "asc" } } } },
        },
      },
      answers: true,
    },
  });

  if (!attempt || attempt.status !== "SUBMITTED") notFound();

  const { registration } = attempt;
  const isOwner = session.role === "STUDENT" && registration.studentId === session.userId;
  const isManagingTeacher = session.role === "TEACHER" && registration.student.managedById === session.userId;
  if (!isOwner && !isManagingTeacher) notFound();

  const answersByQuestion = new Map(attempt.answers.map((a) => [a.questionId, a]));
  const percentage = attempt.totalPoints ? Math.round(((attempt.score ?? 0) / attempt.totalPoints) * 100) : 0;

  const peers = await prisma.examAttempt.findMany({
    where: { status: "SUBMITTED", registration: { competitionId: registration.competitionId } },
    select: { score: true },
  });
  const rank = peers.filter((p) => (p.score ?? 0) > (attempt.score ?? 0)).length + 1;

  const role = session.role === "TEACHER" ? "teacher" : "student";
  const backHref = isOwner ? "/results" : `/teacher/assignments`;

  return (
    <AuthGate role={role}>
      <AppShell role={role}>
        <div className="lms-page space-y-6 p-1">
          <section className="lms-banner">
            <div>
              <p className="lms-banner-kicker">{registration.competition.name}</p>
              <h1>{isOwner ? "Your Result" : `${registration.student.name}'s Result`}</h1>
              <p>{attempt.submittedAt ? `Submitted ${attempt.submittedAt.toLocaleString()}` : ""}</p>
            </div>
            <div className="lms-banner-actions">
              <Link href={backHref} className="lms-btn lms-btn-ghost">Back</Link>
            </div>
          </section>

          <div className="lms-stat-grid">
            <div className="lms-stat"><span>Points scored</span><strong>{attempt.score} / {attempt.totalPoints}</strong></div>
            <div className="lms-stat"><span>Overall score</span><strong>{percentage}%</strong></div>
            <div className="lms-stat"><span>Rank of {peers.length}</span><strong>#{rank}</strong></div>
          </div>
          <Link href="/rankings" className="text-sm font-semibold text-brand hover:underline">View full leaderboard →</Link>

          <div className="space-y-3">
            <p className="lms-panel-title">Question breakdown</p>
            {registration.competition.questions.map((q, i) => {
              const answer = answersByQuestion.get(q.id);
              const choices = JSON.parse(q.choices) as string[];
              const selected = answer?.selectedIndex;
              const correct = answer?.isCorrect ?? false;

              return (
                <div key={q.id} className="lms-panel">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{i + 1}. {q.text}</p>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${correct ? "bg-success/15 text-success" : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"}`}>
                      {correct ? "Correct" : "Incorrect"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {typeof selected === "number" ? `Answer given: ${choices[selected]}` : "No answer given"}
                  </p>
                  {!correct && (
                    <p className="mt-1 text-sm text-success">Correct answer: {choices[q.correctIndex]}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </AppShell>
    </AuthGate>
  );
}
