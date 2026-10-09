import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell, AuthGate } from "@/components/app-shell";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Class Management" };

export default async function AdminClassesPage() {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") redirect("/login");

  const classes = await prisma.class.findMany({
    include: { enrollments: true, teacher: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AuthGate role="admin">
      <AppShell role="admin">
        <div className="space-y-6">
          <section className="rounded-[2rem] bg-gradient-to-r from-sky-950 via-sky-900 to-indigo-900 p-6 text-white shadow-xl sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-sky-200">Classes</p>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl">Class Management</h1>
            <p className="mt-2 text-sm text-sky-100/80">Every class across the platform.</p>
          </section>

          {classes.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <p className="text-sm text-slate-500">No classes have been created yet.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {classes.map((item) => (
                <article key={item.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-lg font-black text-slate-900">{item.name}</p>
                  <p className="mt-2 text-sm text-slate-600">{item.subject}</p>
                  <p className="mt-2 text-sm text-slate-500">{item.enrollments.length} learners</p>
                  <p className="mt-2 text-sm text-slate-500">Teacher: {item.teacher.name}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </AppShell>
    </AuthGate>
  );
}
