import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell, AuthGate } from "@/components/app-shell";
import { ClassRosterManager } from "@/components/class-roster-manager";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "My Classes" };

export default async function TeacherMyClassesPage() {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") redirect("/login");

  const [classes, students] = await Promise.all([
    prisma.class.findMany({
      where: { teacherId: session.userId },
      include: { enrollments: { include: { student: true }, orderBy: { enrolledAt: "asc" } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findMany({ where: { role: "STUDENT", managedById: session.userId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <AuthGate role="teacher">
      <AppShell role="teacher">
        <div className="lms-page space-y-6 p-1">
          <section className="lms-banner">
            <div>
              <p className="lms-banner-kicker">Classes</p>
              <h1>My Classes</h1>
              <p>Create classes and enroll your students so you can target content, assignments, and exams.</p>
            </div>
          </section>

          <ClassRosterManager
            classes={classes.map((c) => ({
              id: c.id,
              name: c.name,
              subject: c.subject,
              enrollments: c.enrollments.map((e) => ({ id: e.id, student: { id: e.student.id, name: e.student.name } })),
            }))}
            students={students.map((s) => ({ id: s.id, name: s.name }))}
          />
        </div>
      </AppShell>
    </AuthGate>
  );
}
