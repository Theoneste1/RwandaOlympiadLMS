import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell, AuthGate } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { latestSubmissionByStudent } from "@/lib/assignments";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Assignments" };

const SECTIONS: { key: string; label: string }[] = [
  { key: "RESUBMISSION_REQUIRED", label: "Resubmission Required" },
  { key: "NOT_STARTED", label: "Not Started" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "PENDING_GRADING", label: "Submitted — Pending Grading" },
  { key: "GRADED", label: "Graded" },
];

export default async function StudentAssignmentsPage() {
  const session = await getSession();
  if (!session || session.role !== "STUDENT") redirect("/login");

  const enrollments = await prisma.classEnrollment.findMany({ where: { studentId: session.userId }, select: { classId: true } });
  const classIds = enrollments.map((e) => e.classId);

  const assignments = classIds.length === 0 ? [] : await prisma.assignment.findMany({
    where: { status: "PUBLISHED", classId: { in: classIds } },
    include: { class: true, submissions: { where: { studentId: session.userId } } },
    orderBy: { dueAt: "asc" },
  });

  const groups: Record<string, typeof assignments> = {
    NOT_STARTED: [],
    IN_PROGRESS: [],
    PENDING_GRADING: [],
    GRADED: [],
    RESUBMISSION_REQUIRED: [],
  };
  const latestByAssignment = new Map<string, (typeof assignments)[number]["submissions"][number] | undefined>();
  for (const assignment of assignments) {
    const latest = latestSubmissionByStudent(assignment.submissions).get(session.userId);
    latestByAssignment.set(assignment.id, latest);
    const bucket = latest?.status ?? "NOT_STARTED";
    groups[bucket]?.push(assignment);
  }

  return (
    <AuthGate role="student">
      <AppShell role="student">
        <div className="lms-page space-y-6 p-1">
          <section className="lms-banner">
            <div>
              <p className="lms-banner-kicker">Assignments</p>
              <h1>Assignments</h1>
              <p>Track what&apos;s due, what&apos;s submitted, and what&apos;s graded.</p>
            </div>
          </section>

          {enrollments.length === 0 ? (
            <div className="lms-empty">You aren&apos;t enrolled in a class yet. Ask your teacher to add you.</div>
          ) : assignments.length === 0 ? (
            <div className="lms-empty">No assignments yet. Check back soon.</div>
          ) : (
            <div className="space-y-6">
              {SECTIONS.filter((section) => groups[section.key].length > 0).map((section) => (
                <div key={section.key} className="space-y-3">
                  <p className="lms-panel-title">{section.label} ({groups[section.key].length})</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {groups[section.key].map((assignment) => {
                      const latest = latestByAssignment.get(assignment.id);
                      return (
                        <Link
                          key={assignment.id}
                          href={`/student/assignments/${assignment.id}`}
                          className="lms-panel block transition hover:border-sky-300"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wide text-brand">{assignment.class.name}</p>
                              <p className="mt-1 text-lg font-black">{assignment.title}</p>
                            </div>
                            <StatusBadge status={latest?.status ?? "NOT_STARTED"} />
                          </div>
                          {assignment.dueAt && <p className="mt-2 text-xs text-muted-foreground">Due {assignment.dueAt.toLocaleString()}</p>}
                          {latest?.score != null && (
                            <p className="mt-2 text-sm font-bold text-sky-700">Score: {latest.score}/{latest.maxScore}</p>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </AppShell>
    </AuthGate>
  );
}
