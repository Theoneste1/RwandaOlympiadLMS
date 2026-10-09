import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell, AuthGate } from "@/components/app-shell";
import { AddStudentForm } from "@/components/add-student-form";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateUserProfileAction } from "@/lib/actions/admin";
import type { Role } from "@prisma/client";

export const metadata: Metadata = { title: "User Directory" };

async function updateProfile(formData: FormData) {
  "use server";
  await updateUserProfileAction({}, formData);
}

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string; role?: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") redirect("/login");

  const { q, role } = await searchParams;
  const roleFilter = role === "STUDENT" || role === "TEACHER" ? (role as Role) : undefined;

  const users = await prisma.user.findMany({
    where: {
      ...(roleFilter ? { role: roleFilter } : {}),
      ...(q ? { name: { contains: q } } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  const [studentCount, teacherCount] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.user.count({ where: { role: "TEACHER" } }),
  ]);

  return (
    <AuthGate role="admin">
      <AppShell role="admin">
        <div className="space-y-6">
          <section className="flex flex-wrap items-end justify-between gap-4 rounded-[2rem] bg-gradient-to-r from-sky-950 via-sky-900 to-indigo-900 p-6 text-white shadow-xl sm:p-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-sky-200">Users</p>
              <h1 className="mt-3 text-3xl font-black sm:text-4xl">User Directory</h1>
              <p className="mt-2 text-sm text-sky-100/80">Every account on the platform.</p>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="User totals">
            {[
              { label: "Total users", value: studentCount + teacherCount },
              { label: "Students", value: studentCount },
              { label: "Teachers / coaches", value: teacherCount },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{stat.label}</p>
                <p className="mt-2 text-2xl font-black text-slate-900">{stat.value}</p>
              </div>
            ))}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-black text-slate-900">Add a student</h2>
            <p className="mt-1 text-sm text-slate-500">New students are managed by whoever creates them. Need a new coach/teacher account? <Link href="/register" className="font-semibold text-sky-700 hover:underline">Register one here.</Link></p>
            <div className="mt-4"><AddStudentForm /></div>
          </section>

          <section className="space-y-4">
            <form className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2" aria-label="Filter by role">
                {[
                  { value: "", label: "All users" },
                  { value: "STUDENT", label: "Students" },
                  { value: "TEACHER", label: "Teachers" },
                ].map((item) => (
                  <Link
                    key={item.value}
                    href={item.value ? `/admin/users?role=${item.value}${q ? `&q=${q}` : ""}` : `/admin/users${q ? `?q=${q}` : ""}`}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                      (role ?? "") === item.value ? "bg-sky-800 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="hidden" name="role" value={role ?? ""} />
                <input
                  type="search"
                  name="q"
                  defaultValue={q ?? ""}
                  placeholder="Search name…"
                  className="min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
                />
                <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Search</button>
              </div>
            </form>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <h2 className="font-black text-slate-900">Users</h2>
                <p className="text-sm text-slate-500">{users.length} shown</p>
              </div>
              <div className="divide-y divide-slate-100">
                {users.length === 0 && <p className="px-4 py-12 text-center text-sm text-slate-500">No users match these filters.</p>}
                {users.map((user) => (
                  <details key={user.id} className="group px-4 py-3">
                    <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
                      <div>
                        <p className="font-bold text-slate-900">{user.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                          {user.role === "TEACHER" ? "Teacher" : "Student"}
                        </span>
                        {user.grade && <span className="text-xs text-slate-500">Grade {user.grade}</span>}
                        <span className="text-xs font-semibold text-sky-700 group-open:hidden">Edit</span>
                        <span className="hidden text-xs font-semibold text-sky-700 group-open:inline">Close</span>
                      </div>
                    </summary>
                    <form action={updateProfile} className="mt-3 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-3">
                      <input type="hidden" name="id" value={user.id} />
                      <label className="text-xs font-semibold text-slate-600">
                        Full name
                        <input name="name" defaultValue={user.name} required className="mt-1 w-56 rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal" />
                      </label>
                      <label className="text-xs font-semibold text-slate-600">
                        Grade
                        <input name="grade" defaultValue={user.grade ?? ""} placeholder="e.g. S3" className="mt-1 w-32 rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal" />
                      </label>
                      <button type="submit" className="rounded-lg bg-sky-800 px-4 py-2 text-sm font-bold text-white hover:bg-sky-900">Save</button>
                    </form>
                  </details>
                ))}
              </div>
            </div>
          </section>
        </div>
      </AppShell>
    </AuthGate>
  );
}
