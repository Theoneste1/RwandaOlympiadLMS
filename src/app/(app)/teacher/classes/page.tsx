import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell, AuthGate } from "@/components/app-shell";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "My Classes" };

export default async function TeacherClassesPage() {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") redirect("/login");

  const classes = await prisma.class.findMany({
    where: { teacherId: session.userId },
    include: {
      enrollments: true,
      assignments: { include: { submissions: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <AuthGate role="teacher">
      <AppShell role="teacher">
        <div className="space-y-6">
          <section className="rounded-[2rem] bg-gradient-to-r from-emerald-900 via-sky-900 to-indigo-900 p-6 text-white shadow-xl sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-200">Classes</p>
                <h1 className="mt-3 text-3xl font-black sm:text-4xl">My Classes</h1>
              </div>
              <Link href="/teacher/my-classes" className="rounded-xl border border-white/20 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10">
                Create a class / manage roster
              </Link>
            </div>
          </section>

          {classes.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <p className="text-sm text-slate-500">You don&apos;t have any classes yet.</p>
              <Link href="/teacher/my-classes" className="mt-3 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                Create your first class
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {classes.map((item) => {
                const submissions = item.assignments.flatMap((a) => a.submissions);
                const pending = submissions.filter((s) => s.status === "PENDING_GRADING").length;
                return (
                  <div key={item.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xl font-black text-slate-900">{item.name}</p>
                      {pending > 0 && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">{pending} pending</span>}
                    </div>
                    <p className="mt-3 text-sm font-semibold uppercase tracking-[0.15em] text-sky-700">{item.subject}</p>
                    <p className="mt-3 text-sm text-slate-600">{item.enrollments.length} students</p>
                    <Link href={`/teacher/classes/${item.id}`} className="mt-5 inline-flex rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                      Open Class
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </AppShell>
    </AuthGate>
  );
}
