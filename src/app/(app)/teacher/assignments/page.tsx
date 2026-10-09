import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell, AuthGate } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { latestSubmissionByStudent } from "@/lib/assignments";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ContentStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Assignments" };

const STATUS_FILTERS: { value: ContentStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "PUBLISHED", label: "Published" },
  { value: "ARCHIVED", label: "Archived" },
];

function buildQuery(params: Record<string, string | undefined>, overrides: Record<string, string>) {
  const next = new URLSearchParams();
  const merged = { ...params, ...overrides };
  for (const [key, value] of Object.entries(merged)) {
    if (value) next.set(key, value);
  }
  const qs = next.toString();
  return qs ? `/teacher/assignments?${qs}` : "/teacher/assignments";
}

export default async function TeacherAssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; status?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") redirect("/login");

  const params = await searchParams;
  const classes = await prisma.class.findMany({ where: { teacherId: session.userId }, orderBy: { name: "asc" } });

  const allAssignments = await prisma.assignment.findMany({
    where: { class: { teacherId: session.userId } },
    include: { class: { include: { enrollments: true } }, submissions: true },
    orderBy: { createdAt: "desc" },
  });

  let pendingSubmissions = 0;
  let pendingGrading = 0;
  let graded = 0;
  let resubmissionRequired = 0;

  for (const assignment of allAssignments) {
    if (assignment.status !== "PUBLISHED") continue;
    const latest = latestSubmissionByStudent(assignment.submissions);
    for (const enrollment of assignment.class.enrollments) {
      const submission = latest.get(enrollment.studentId);
      if (!submission || submission.status === "IN_PROGRESS") pendingSubmissions++;
      else if (submission.status === "PENDING_GRADING") pendingGrading++;
      else if (submission.status === "GRADED") graded++;
      else if (submission.status === "RESUBMISSION_REQUIRED") resubmissionRequired++;
    }
  }

  const assignments = allAssignments.filter((assignment) => {
    if (params.classId && assignment.classId !== params.classId) return false;
    if (params.status && assignment.status !== params.status) return false;
    return true;
  });

  return (
    <AuthGate role="teacher">
      <AppShell role="teacher">
        <div className="lms-page space-y-6 p-1">
          <section className="lms-banner">
            <div>
              <p className="lms-banner-kicker">Assignments</p>
              <h1>Assignments</h1>
              <p>Create, publish, and grade assignments for your classes.</p>
            </div>
            <div className="lms-banner-actions">
              <Link href="/teacher/my-classes" className="lms-btn lms-btn-ghost">Manage classes</Link>
              <Link href="/teacher/assignments/new" className="lms-btn lms-btn-primary">Create assignment</Link>
            </div>
          </section>

          <div className="lms-stat-grid">
            <div className="lms-stat"><span>Total</span><strong>{allAssignments.length}</strong></div>
            <div className="lms-stat"><span>Pending submissions</span><strong>{pendingSubmissions}</strong></div>
            <div className="lms-stat"><span>Pending grading</span><strong>{pendingGrading}</strong></div>
            <div className="lms-stat"><span>Graded</span><strong>{graded}</strong></div>
            <div className="lms-stat"><span>Resubmission required</span><strong>{resubmissionRequired}</strong></div>
          </div>

          {classes.length === 0 ? (
            <div className="lms-empty">
              <p>You don&apos;t have any classes yet.</p>
              <Link href="/teacher/my-classes" className="lms-btn lms-btn-primary mt-4 inline-flex">
                Create your first class
              </Link>
            </div>
          ) : (
            <>
              <div className="lms-filter-bar" aria-label="Filter by status">
                {STATUS_FILTERS.map((item) => (
                  <Link
                    key={item.value}
                    href={buildQuery(params, { status: item.value === "ALL" ? "" : item.value })}
                    className={`lms-filter-chip ${(params.status ?? "ALL") === item.value ? "active" : ""}`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
              <div className="lms-filter-bar" aria-label="Filter by class">
                <Link href={buildQuery(params, { classId: "" })} className={`lms-filter-chip ${!params.classId ? "active" : ""}`}>
                  All classes
                </Link>
                {classes.map((classItem) => (
                  <Link
                    key={classItem.id}
                    href={buildQuery(params, { classId: classItem.id })}
                    className={`lms-filter-chip ${params.classId === classItem.id ? "active" : ""}`}
                  >
                    {classItem.name}
                  </Link>
                ))}
              </div>

              {assignments.length === 0 ? (
                <div className="lms-empty">No assignments match these filters yet.</div>
              ) : (
                <div className="lms-table-wrap">
                  <table className="lms-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Status</th>
                        <th>Class</th>
                        <th>Due</th>
                        <th>Created</th>
                        <th>Published</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.map((assignment) => (
                        <tr key={assignment.id}>
                          <td>{assignment.title}</td>
                          <td><StatusBadge status={assignment.status} /></td>
                          <td>{assignment.class.name}</td>
                          <td>{assignment.dueAt ? assignment.dueAt.toLocaleString() : "—"}</td>
                          <td>{assignment.createdAt.toLocaleDateString()}</td>
                          <td>{assignment.publishedAt ? assignment.publishedAt.toLocaleDateString() : "—"}</td>
                          <td>
                            <div className="lms-table-actions">
                              <Link href={`/teacher/assignments/${assignment.id}`}>View</Link>
                              <Link href={`/teacher/assignments/${assignment.id}/edit`}>Edit</Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </AppShell>
    </AuthGate>
  );
}
