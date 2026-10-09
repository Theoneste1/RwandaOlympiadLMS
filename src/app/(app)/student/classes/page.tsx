import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell, AuthGate } from "@/components/app-shell";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "My Classes" };

export default async function StudentClassesPage() {
  const session = await getSession();
  if (!session || session.role !== "STUDENT") redirect("/login");

  const enrollments = await prisma.classEnrollment.findMany({
    where: { studentId: session.userId },
    include: { class: { include: { teacher: true, enrollments: true } } },
    orderBy: { enrolledAt: "asc" },
  });

  return (
    <AuthGate role="student">
      <AppShell role="student">
        <div className="space-y-6">
          <section className="rounded-[2rem] bg-gradient-to-r from-sky-950 via-sky-900 to-indigo-900 p-6 text-white shadow-xl sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-sky-200">Classes</p>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl">My Classes</h1>
          </section>

          {enrollments.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <p className="text-sm text-slate-500">You&apos;re not enrolled in any classes yet. Ask your coach for an invite.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {enrollments.map(({ class: item }) => (
                <div key={item.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xl font-black text-slate-900">{item.name}</p>
                  <p className="mt-3 text-sm font-semibold uppercase tracking-[0.15em] text-sky-700">{item.subject}</p>
                  <p className="mt-3 text-sm text-slate-600">{item.enrollments.length} students</p>
                  <p className="mt-3 text-sm text-slate-600">Coach: {item.teacher.name}</p>
                  <Link href={`/student/classes/${item.id}`} className="mt-5 inline-flex rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                    Open Class
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </AppShell>
    </AuthGate>
  );
}
