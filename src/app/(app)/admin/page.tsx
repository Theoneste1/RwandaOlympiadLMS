import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell, AuthGate } from "@/components/app-shell";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Admin Dashboard" };

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") redirect("/login");

  const [studentCount, teacherCount, classCount, competitionCount, recentUsers, classes] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.user.count({ where: { role: "TEACHER" } }),
    prisma.class.count(),
    prisma.competition.count(),
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.class.findMany({ include: { enrollments: true, teacher: true }, orderBy: { createdAt: "desc" }, take: 6 }),
  ]);

  return (
    <AuthGate role="admin">
      <AppShell role="admin">
        <div className="space-y-6">
          <section className="rounded-[2rem] bg-gradient-to-r from-sky-950 via-sky-900 to-indigo-900 p-6 text-white shadow-xl sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-sky-200">Admin portal</p>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl">Platform overview</h1>
            <p className="mt-2 text-sm text-sky-100/80">Monitor ROF operations across learners, teachers, classes, and competitions.</p>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Students", value: studentCount.toLocaleString() },
              { label: "Teachers", value: teacherCount.toLocaleString() },
              { label: "Classes", value: classCount.toLocaleString() },
              { label: "Competitions", value: competitionCount.toLocaleString() },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{stat.label}</p>
                <p className="mt-3 text-3xl font-black text-slate-900">{stat.value}</p>
              </div>
            ))}
          </section>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-black text-slate-900">Recent Sign-ups</h2>
                <Link href="/admin/users" className="text-sm font-semibold text-sky-700 hover:underline">Open users</Link>
              </div>

              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Name</th>
                      <th className="px-4 py-3 font-semibold">Role</th>
                      <th className="px-4 py-3 font-semibold">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {recentUsers.map((user) => (
                      <tr key={user.id}>
                        <td className="px-4 py-3 font-semibold text-slate-700">{user.name}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                            {user.role === "TEACHER" ? "Teacher" : "Student"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{user.createdAt.toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-black text-slate-900">Active Classes</h2>
                <Link href="/admin/classes" className="text-sm font-semibold text-sky-700 hover:underline">View all</Link>
              </div>
              <div className="mt-5 space-y-4">
                {classes.length === 0 ? (
                  <p className="text-sm text-slate-500">No classes have been created yet.</p>
                ) : (
                  classes.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="font-black text-slate-900">{item.name}</p>
                      <p className="mt-1 text-sm text-slate-600">{item.subject} · Coach {item.teacher.name}</p>
                      <p className="mt-2 text-sm text-slate-500">{item.enrollments.length} learners enrolled</p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </AppShell>
    </AuthGate>
  );
}
