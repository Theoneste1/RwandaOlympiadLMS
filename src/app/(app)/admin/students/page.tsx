import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell, AuthGate } from "@/components/app-shell";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Student Management" };

function average(scores: { score: number | null; maxScore: number | null }[]) {
  const usable = scores.filter((s) => s.score != null && s.maxScore);
  if (usable.length === 0) return null;
  return Math.round(usable.reduce((sum, s) => sum + (s.score! / s.maxScore!) * 100, 0) / usable.length);
}

export default async function AdminStudentsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") redirect("/login");

  const { q } = await searchParams;
  const students = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      ...(q ? { name: { contains: q } } : {}),
    },
    include: {
      managedBy: true,
      assignmentSubmissions: { where: { status: "GRADED" }, select: { score: true, maxScore: true } },
      registrations: { include: { attempt: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <AuthGate role="admin">
      <AppShell role="admin">
        <div className="space-y-6">
          <section className="rounded-[2rem] bg-gradient-to-r from-sky-950 via-sky-900 to-indigo-900 p-6 text-white shadow-xl sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-sky-200">Students</p>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl">Student Management</h1>
          </section>

          <form className="flex gap-2">
            <label className="sr-only" htmlFor="student-search">Search students</label>
            <input
              id="student-search"
              type="search"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search by name…"
              className="w-full max-w-sm rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
            />
            <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Search</button>
            {q && <Link href="/admin/students" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Clear</Link>}
          </form>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            {students.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">No students match.</p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-[640px] w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Name</th>
                      <th className="px-4 py-3 font-semibold">Student ID</th>
                      <th className="px-4 py-3 font-semibold">Grade</th>
                      <th className="px-4 py-3 font-semibold">Coach</th>
                      <th className="px-4 py-3 font-semibold">Average</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {students.map((student) => {
                      const examScores = student.registrations.filter((r) => r.attempt?.status === "SUBMITTED").map((r) => ({ score: r.attempt!.score, maxScore: r.attempt!.totalPoints }));
                      const avg = average([...student.assignmentSubmissions, ...examScores]);
                      return (
                        <tr key={student.id}>
                          <td className="px-4 py-3 font-semibold text-slate-700">{student.name}</td>
                          <td className="px-4 py-3">{student.studentIdNumber ?? "—"}</td>
                          <td className="px-4 py-3">{student.grade ?? "—"}</td>
                          <td className="px-4 py-3">{student.managedBy?.name ?? "Self-registered"}</td>
                          <td className="px-4 py-3 font-bold text-sky-700">{avg != null ? `${avg}%` : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </AppShell>
    </AuthGate>
  );
}
