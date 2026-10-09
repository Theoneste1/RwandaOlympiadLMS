import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell, AuthGate } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Exams" };

const SUBJECTS = [
  { value: "all", label: "All exams", icon: "layers" },
  { value: "Mathematics", label: "Mathematics", icon: "shapes" },
  { value: "COMBINATORICS", label: "Combinatorics", icon: "grid" },
  { value: "GEOMETRY", label: "Geometry", icon: "triangle" },
  { value: "ALGEBRA", label: "Algebra", icon: "formula" },
];

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    layers: <><path d="m12 3 8 4-8 4-8-4 8-4Z" /><path d="m4 12 8 4 8-4M4 17l8 4 8-4" /></>,
    shapes: <><circle cx="8" cy="8" r="3" /><path d="M14 5h5v5h-5zM14 14h5v5h-5zM5 14h6v6H5z" /></>,
    grid: <><rect x="4" y="4" width="6" height="6" /><rect x="14" y="4" width="6" height="6" /><rect x="4" y="14" width="6" height="6" /><rect x="14" y="14" width="6" height="6" /></>,
    triangle: <><path d="m12 4 9 16H3L12 4Z" /><path d="M12 10v4M12 17h.01" /></>,
    formula: <><path d="M5 5h5M5 19h5M8 5l-3 7 3 7M14 7h5M14 17h5M14 12h5" /></>,
    atom: <><circle cx="12" cy="12" r="2" /><path d="M19.4 15c2-3.5.8-6.4-1.2-6.4S13.3 10.3 12 12s-4.2 3.4-6.2 3.4-3.2-2.9-1.2-6.4 5-3.5 7-2.4 3.4 4.2 3.4 7.4-1.4 5.4-3.4 7.4-5 .9-7-2.4-.8-6.4 1.2-6.4 4.9 1.7 6.2 3.4 4.2 3.4 6.2 3.4 3.2-2.9 1.2-6.4Z" /></>,
  };

  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export default async function StudentExamsPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "STUDENT") redirect("/login");

  const params = await searchParams;
  const subject = SUBJECTS.some((item) => item.value === params.subject) ? params.subject : "all";
  const selectedSubject = SUBJECTS.find((item) => item.value === subject);
  const registrations = await prisma.registration.findMany({
    where: {
      studentId: session.userId,
      ...(subject === "Mathematics" ? { competition: { subject } } : {}),
      ...(subject !== "all" && subject !== "Mathematics" ? { competition: { topic: subject } } : {}),
    },
    include: { competition: { include: { questions: true } }, attempt: true },
    orderBy: { createdAt: "desc" },
  });

  const discoverable = await prisma.competition.findMany({
    where: { id: { notIn: registrations.map((r) => r.competitionId) } },
    include: { _count: { select: { questions: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <AuthGate role="student">
      <AppShell role="student">
    <div className="exam-browser min-h-full px-4 py-6 sm:px-8 sm:py-9">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">Student portal</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Exams</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">Challenge yourself, build confidence, and see how far your thinking can go.</p>
        </header>

        <nav className="exam-filters" aria-label="Filter exams by subject">
          {SUBJECTS.map((item) => (
            <Link key={item.value} href={item.value === "all" ? "/Student/Exams" : `/Student/Exams?subject=${item.value}`} className={`exam-filter ${subject === item.value ? "active" : ""}`}>
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-8 flex items-end justify-between gap-4">
          <div><p className="text-sm font-bold text-brand">{registrations.length} available</p><h2 className="mt-1 text-2xl font-black">{subject === "all" || subject === "Mathematics" ? "Mathematics competitions" : `${selectedSubject?.label} exams`}</h2></div>
        </div>

        {registrations.length === 0 ? (
          <div className="exam-empty mt-5"><p className="font-bold">No exams in this subject yet</p><p className="mt-1 text-sm text-muted-foreground">Try another category or check back when your teacher assigns a new challenge.</p></div>
        ) : (
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            {registrations.map((registration, index) => {
              const completedAttemptId = registration.status === "COMPLETED" ? registration.attempt?.id : undefined;
              const isComplete = Boolean(completedAttemptId);
              const actionHref = completedAttemptId ? `/results/${completedAttemptId}` : `/student/exams/${registration.id}`;
              return (
                <article key={registration.id} className={`exam-card exam-card-${index % 3}`}>
                  <div className="exam-card-hero"><span className="exam-card-icon"><Icon name={index % 2 ? "atom" : "shapes"} size={28} /></span><span className="exam-card-time">{registration.competition.durationMinutes} min</span><h3>{registration.competition.name}</h3></div>
                  <div className="exam-card-body">
                    <div className="exam-cover"><span>{registration.competition.topic === "GEOMETRY" ? "GEO" : registration.competition.topic === "COMBINATORICS" ? "COMB" : "ALG"}</span><strong>{registration.competition.subject}</strong><small>Think. Solve. Shine.</small></div>
                    <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-2"><span className="exam-chip">{registration.competition.topic}</span><span className="exam-chip">{registration.competition.questions?.length ?? 0} questions</span></div>
                    <p className="mt-4 min-h-12 text-sm leading-6 text-muted-foreground">{registration.competition.summary}</p>
                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-border/70 pt-4"><StatusBadge status={registration.status} /><Link href={actionHref} className="exam-action">{isComplete ? "View result" : registration.status === "IN_PROGRESS" ? "Continue exam" : "Start exam"} <span aria-hidden="true">→</span></Link></div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {discoverable.length > 0 && (
          <div className="mt-10">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Question bank</p>
            <h2 className="mt-1 text-xl font-black">More competitions in the question bank</h2>
            <p className="mt-1 text-sm text-muted-foreground">Not assigned to you yet — ask your coach to register you.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {discoverable.map((competition) => (
                <div key={competition.id} className="rounded-lg border border-border bg-muted/40 p-4">
                  <p className="font-semibold">{competition.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{competition.subject} · {competition.topic.replace("_", " ")}</p>
                  <p className="mt-2 text-xs font-semibold text-muted-foreground">{competition._count.questions} questions · {competition.durationMinutes} min</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
      </AppShell>
    </AuthGate>
  );
}