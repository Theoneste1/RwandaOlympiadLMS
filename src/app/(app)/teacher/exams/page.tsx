import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell, AuthGate } from "@/components/app-shell";
import { COMPETITIONS } from "@/data/competitions";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Teacher Exams" };

const CATEGORIES = [
  { value: "All", label: "All", icon: "layers" },
  { value: "Mathematics", label: "Mathematics", icon: "shapes" },
  { value: "Science", label: "Science", icon: "flask" },
  { value: "Informatics", label: "Computing", icon: "atom" },
];

function Icon({ name, size = 19 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    layers: <><path d="m12 3 8 4-8 4-8-4 8-4Z" /><path d="m4 12 8 4 8-4M4 17l8 4 8-4" /></>,
    shapes: <><circle cx="8" cy="8" r="3" /><path d="M14 5h5v5h-5zM14 14h5v5h-5zM5 14h6v6H5z" /></>,
    flask: <><path d="M9 3h6M10 3v6l-5 9a1.5 1.5 0 0 0 1.3 2.2h11.4A1.5 1.5 0 0 0 19 18l-5-9V3M8 15h8" /></>,
    atom: <><circle cx="12" cy="12" r="2" /><path d="M19.4 15c2-3.5.8-6.4-1.2-6.4S13.3 10.3 12 12s-4.2 3.4-6.2 3.4-3.2-2.9-1.2-6.4 5-3.5 7-2.4 3.4 4.2 3.4 7.4-1.4 5.4-3.4 7.4-5 .9-7-2.4-.8-6.4 1.2-6.4 4.9 1.7 6.2 3.4 4.2 3.4 6.2 3.4 3.2-2.9 1.2-6.4Z" /></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date));
}

export default async function TeacherExamsPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") redirect("/login");

  const params = await searchParams;
  const category = CATEGORIES.some((item) => item.value === params.category) ? params.category ?? "All" : "All";
  const exams = category === "All" ? COMPETITIONS : COMPETITIONS.filter((competition) => competition.subject === category);
  const selected = CATEGORIES.find((item) => item.value === category);

  const slugs = COMPETITIONS.map((c) => c.slug);
  const liveCompetitions = await prisma.competition.findMany({
    where: { slug: { in: slugs } },
    include: { _count: { select: { registrations: true } } },
  });
  const liveBySlug = new Map(liveCompetitions.map((c) => [c.slug, c]));

  return (
    <AuthGate role="teacher">
      <AppShell role="teacher">
    <div className="teacher-exams-page min-h-full px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="teacher-exams-heading">
          <div>
            <p>Teacher portal</p>
            <h1>Exams</h1>
            <small>Browse competitions and assign the ones with a ready question bank to your students.</small>
          </div>
        </header>
        <nav className="teacher-exam-filters" aria-label="Filter exams by subject">{CATEGORIES.map((item) => <Link key={item.value} href={item.value === "All" ? "/teacher/exams" : `/teacher/exams?category=${item.value}`} className={`teacher-exam-filter ${category === item.value ? "active" : ""}`}><Icon name={item.icon} /><span>{item.label}</span></Link>)}</nav>
        <div className="mt-7 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-brand">{exams.length} available</p><h2 className="mt-1 text-2xl font-black">{category === "All" ? "All competitions" : `${selected?.label} competitions`}</h2></div></div>
        {exams.length === 0 ? <div className="teacher-exams-empty">No competitions are available in this category yet.</div> : <div className="mt-5 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">{exams.map((exam, index) => {
          const live = liveBySlug.get(exam.slug);
          return (
            <article key={exam.slug} className={`teacher-exam-card teacher-exam-card-${index % 3}`}>
              <div className="teacher-exam-hero"><span><Icon name={CATEGORIES.find((item) => item.value === exam.subject)?.icon ?? "layers"} size={27} /></span><em>Deadline {formatDate(exam.registrationDeadline)}</em><h3>{exam.name}</h3></div>
              <div className="teacher-exam-body">
                <div className="teacher-exam-cover"><strong>{exam.subject === "Mathematics" ? "MATH" : exam.subject === "Science" ? "SCI" : "CODE"}</strong><small>2026 / 27</small></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-2"><span className="exam-chip">{exam.format}</span><span className="exam-chip">{exam.gradeGroups[0]}</span></div>
                  <p>{exam.summary}</p>
                  <div className="teacher-exam-stats">
                    <span><strong>{live ? live._count.registrations : "—"}</strong>Registered</span>
                    <span><strong>{exam.gradeGroups.length}</strong>Grade groups</span>
                  </div>
                  <div className="teacher-exam-actions">
                    <Link href={`/competitions/${exam.slug}`}>View details</Link>
                    {live ? (
                      <Link href="/teacher#assign-competition">Assign students</Link>
                    ) : (
                      <span className="text-xs font-semibold text-muted-foreground" title="No question bank has been added for this competition yet">
                        Question bank pending
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </article>
          );
        })}</div>}
      </div>
    </div>
      </AppShell>
    </AuthGate>
  );
}
