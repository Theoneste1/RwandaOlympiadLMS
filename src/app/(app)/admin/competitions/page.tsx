import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell, AuthGate } from "@/components/app-shell";
import { COMPETITIONS } from "@/data/competitions";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Competition Catalog" };

export default async function AdminCompetitionsPage() {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") redirect("/login");

  const liveCompetitions = await prisma.competition.findMany({
    include: { _count: { select: { registrations: true, questions: true } } },
    orderBy: { name: "asc" },
  });
  const liveSlugs = new Set(liveCompetitions.map((c) => c.slug));
  const pendingCatalog = COMPETITIONS.filter((c) => !liveSlugs.has(c.slug));

  return (
    <AuthGate role="admin">
      <AppShell role="admin">
        <div className="space-y-6">
          <section className="rounded-[2rem] bg-gradient-to-r from-sky-950 via-sky-900 to-indigo-900 p-6 text-white shadow-xl sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-sky-200">Competitions</p>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl">Competition Catalog</h1>
            <p className="mt-2 text-sm text-sky-100/80">Competitions with a question bank are ready to assign; the rest are on the public calendar only.</p>
          </section>

          <div className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Ready to assign</h2>
            {liveCompetitions.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">No competitions have a question bank yet.</div>
            ) : (
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {liveCompetitions.map((competition) => (
                  <article key={competition.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-lg font-black text-slate-900">{competition.name}</p>
                    <p className="mt-2 text-sm text-slate-600">{competition.subject} · {competition.topic}</p>
                    <p className="mt-2 text-sm text-slate-500">{competition._count.questions} questions · {competition.durationMinutes} min</p>
                    <span className="mt-3 inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                      {competition._count.registrations} registered
                    </span>
                  </article>
                ))}
              </section>
            )}
          </div>

          {pendingCatalog.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">On the calendar — question bank pending</h2>
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {pendingCatalog.map((competition) => (
                  <article key={competition.slug} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-lg font-black text-slate-900">{competition.name}</p>
                    <p className="mt-2 text-sm text-slate-600">{competition.subject} · {competition.format}</p>
                    <span className="mt-3 inline-flex rounded-full bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600">Not yet assignable</span>
                  </article>
                ))}
              </section>
            </div>
          )}
        </div>
      </AppShell>
    </AuthGate>
  );
}
