import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell, AuthGate } from "@/components/app-shell";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { StatusBadge } from "@/components/status-badge";
import { publishAssignmentAction, archiveAssignmentAction } from "@/lib/actions/assignments";
import { isLate, latestSubmissionByStudent } from "@/lib/assignments";
import { effectiveAssignmentStatus } from "@/lib/insights";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Assignment" };

async function publishAction(formData: FormData) {
  "use server";
  await publishAssignmentAction({}, formData);
}
async function archiveAction(formData: FormData) {
  "use server";
  await archiveAssignmentAction({}, formData);
}

export default async function TeacherAssignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") redirect("/login");

  const { id } = await params;
  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: {
      class: { include: { enrollments: { include: { student: true }, orderBy: { enrolledAt: "asc" } } } },
      questions: { orderBy: { order: "asc" } },
      submissions: true,
    },
  });
  if (!assignment || assignment.class.teacherId !== session.userId) notFound();

  const latest = latestSubmissionByStudent(assignment.submissions);
  const totalPoints = assignment.questions.reduce((sum, q) => sum + q.points, 0);

  return (
    <AuthGate role="teacher">
      <AppShell role="teacher">
        <div className="lms-page space-y-6 p-1">
          <section className="lms-banner">
            <div>
              <p className="lms-banner-kicker">{assignment.class.name}</p>
              <h1>{assignment.title}</h1>
              <p>{assignment.questions.length} question{assignment.questions.length === 1 ? "" : "s"} · {totalPoints} points{assignment.dueAt ? ` · Due ${assignment.dueAt.toLocaleString()}` : ""}</p>
            </div>
            <div className="lms-banner-actions">
              <StatusBadge status={assignment.status} />
            </div>
          </section>

          <div className="lms-panel">
            <div className="lms-table-actions">
              <Link href={`/teacher/assignments/${assignment.id}/edit`} className="lms-btn lms-btn-ghost">Edit</Link>
              {assignment.status === "DRAFT" && (
                <form action={publishAction}>
                  <input type="hidden" name="id" value={assignment.id} />
                  <button type="submit" className="lms-btn lms-btn-primary">Publish</button>
                </form>
              )}
              {assignment.status !== "ARCHIVED" && (
                <form action={archiveAction}>
                  <input type="hidden" name="id" value={assignment.id} />
                  <ConfirmSubmitButton
                    confirmText={`Archive "${assignment.title}"? Students will no longer see it in their assignment list.`}
                    className="lms-btn lms-btn-danger"
                  >
                    Archive
                  </ConfirmSubmitButton>
                </form>
              )}
            </div>
            <p className="mt-4 whitespace-pre-wrap">{assignment.instructions}</p>
            {assignment.attachmentUrl && (
              <p className="mt-3">
                <a href={assignment.attachmentUrl} target="_blank" rel="noreferrer" className="lms-btn lms-btn-ghost">
                  View attachment
                </a>
              </p>
            )}
          </div>

          <div className="lms-panel-title">Student submissions</div>
          {assignment.class.enrollments.length === 0 ? (
            <div className="lms-empty">No students are enrolled in this class yet.</div>
          ) : (
            <div className="lms-table-wrap">
              <table className="lms-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Status</th>
                    <th>Attempt</th>
                    <th>Submitted</th>
                    <th>Score</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assignment.class.enrollments.map((enrollment) => {
                    const submission = latest.get(enrollment.studentId);
                    return (
                      <tr key={enrollment.id}>
                        <td>{enrollment.student.name}</td>
                        <td><StatusBadge status={effectiveAssignmentStatus(submission?.status, assignment.dueAt)} /></td>
                        <td>{submission ? `#${submission.attemptNumber}` : "—"}</td>
                        <td>
                          {submission?.submittedAt ? (
                            <>
                              {submission.submittedAt.toLocaleString()}
                              {isLate(submission.submittedAt, assignment.dueAt) && (
                                <span className="ml-1 text-xs font-bold text-red-600">(Late)</span>
                              )}
                            </>
                          ) : "—"}
                        </td>
                        <td>{submission?.score != null ? `${submission.score}/${submission.maxScore}` : "—"}</td>
                        <td>
                          {submission && submission.status !== "IN_PROGRESS" ? (
                            <Link href={`/teacher/assignments/${assignment.id}/submissions/${submission.id}`} className="lms-btn lms-btn-ghost">
                              {submission.status === "GRADED" ? "Review" : "Grade"}
                            </Link>
                          ) : (
                            <span className="text-xs text-muted-foreground">Not submitted yet</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </AppShell>
    </AuthGate>
  );
}
