import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell, AuthGate } from "@/components/app-shell";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "My Results" };

function TrophyIcon() {
  return <svg aria-hidden="true" width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Zm0 2H4v2a4 4 0 0 0 4 4m9-6h3v2a4 4 0 0 1-4 4M9 2h6v2H9z" /></svg>;
}

export default async function StudentResultsPage() {
  const session = await getSession();
  if (!session || session.role !== "STUDENT") redirect("/login");

  const attempts = await prisma.examAttempt.findMany({
    where: { status: "SUBMITTED", registration: { studentId: session.userId } },
    include: { registration: { include: { competition: true } } },
    orderBy: { submittedAt: "desc" },
  });

  return (
    <AuthGate role="student">
      <AppShell role="student">
    <div className="results-page min-h-full px-4 py-5 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <section className="results-banner"><p>Student portal</p><h1><span className="results-banner-icon"><TrophyIcon /></span> My results</h1><small>Your exam and competition results</small></section>

        {attempts.length === 0 ? (
          <section className="results-empty">
            <div className="results-empty-icon"><TrophyIcon /></div>
            <h2>No results yet</h2>
            <p>Your completed exam results will appear here.</p>
            <Link href="/Student/Exams" className="results-empty-action">Browse exams</Link>
          </section>
        ) : (
          <section className="results-list">
            <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">Your progress</p><h2 className="mt-1 text-xl font-black">Completed exams</h2></div><Link href="/Student/Exams" className="text-sm font-bold text-brand hover:underline">Take another exam →</Link></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {attempts.map((attempt) => {
                const percentage = attempt.totalPoints ? Math.round(((attempt.score ?? 0) / attempt.totalPoints) * 100) : 0;
                return <Link key={attempt.id} href={`/results/${attempt.id}`} className="result-card"><span className="result-card-icon"><TrophyIcon /></span><span className="min-w-0 flex-1"><strong className="block truncate">{attempt.registration.competition.name}</strong><small>{attempt.submittedAt?.toLocaleDateString() ?? "Completed"}</small></span><span className="result-score"><strong>{percentage}%</strong><small>{attempt.score}/{attempt.totalPoints}</small></span></Link>;
              })}
            </div>
          </section>
        )}
      </div>
    </div>
      </AppShell>
    </AuthGate>
  );
}