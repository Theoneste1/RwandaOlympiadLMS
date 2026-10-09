import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell, AuthGate } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { AssignmentRoom } from "@/components/assignment-room";
import { CommentThread, type CommentWithAuthor } from "@/components/comment-thread";
import { getOrCreateEditableSubmission, isEnrolledInClass } from "@/lib/assignments";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Assignment" };

export default async function StudentAssignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "STUDENT") redirect("/login");

  const { id } = await params;
  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: { class: true, questions: { orderBy: { order: "asc" } } },
  });
  if (!assignment) notFound();

  // Draft assignments are never reachable by a student, even by direct URL.
  const enrolled = await isEnrolledInClass(assignment.classId, session.userId);
  if (!enrolled || assignment.status !== "PUBLISHED") notFound();

  // Opening the assignment starts (or resumes) the student's current editable attempt,
  // mirroring how opening an exam room starts its attempt.
  await getOrCreateEditableSubmission(assignment.id, session.userId);

  const allSubmissions = await prisma.assignmentSubmission.findMany({
    where: { assignmentId: assignment.id, studentId: session.userId },
    orderBy: { attemptNumber: "desc" },
    include: { answers: true, files: true },
  });
  const latest = allSubmissions[0];
  const priorAttempts = allSubmissions.slice(1);
  const isEditable = latest.status === "IN_PROGRESS";
  const justResubmitted = priorAttempts[0]?.status === "RESUBMISSION_REQUIRED" ? priorAttempts[0] : null;

  const comments = await prisma.comment.findMany({
    where: { targetType: "ASSIGNMENT", targetId: id },
    include: { author: true },
    orderBy: { createdAt: "asc" },
  });
  const commentData: CommentWithAuthor[] = comments.map((comment) => ({
    id: comment.id,
    body: comment.body,
    authorId: comment.authorId,
    authorName: comment.author.name,
    createdAt: comment.createdAt.toISOString(),
    deletedAt: comment.deletedAt ? comment.deletedAt.toISOString() : null,
    parentId: comment.parentId,
  }));

  return (
    <AuthGate role="student">
      <AppShell role="student">
        <div className="lms-page space-y-6 p-1">
          <section className="lms-banner">
            <div>
              <p className="lms-banner-kicker">{assignment.class.name}</p>
              <h1>{assignment.title}</h1>
              {assignment.dueAt && <p>Due {assignment.dueAt.toLocaleString()}</p>}
            </div>
            <div className="lms-banner-actions">
              <StatusBadge status={latest.status} />
            </div>
          </section>

          <Link href="/student/assignments" className="lms-btn lms-btn-ghost inline-flex w-fit">
            ← Back to assignments
          </Link>

          {justResubmitted && (
            <div className="lms-notice-banner lms-notice-warning">
              <strong>Resubmission requested:</strong>&nbsp;{justResubmitted.resubmissionReason}
            </div>
          )}

          <div className="lms-panel">
            <p className="lms-panel-title">Instructions</p>
            <p className="mt-2 whitespace-pre-wrap">{assignment.instructions}</p>
            {assignment.attachmentUrl && (
              <p className="mt-3">
                <a href={assignment.attachmentUrl} target="_blank" rel="noreferrer" className="lms-btn lms-btn-ghost">
                  View attachment
                </a>
              </p>
            )}
          </div>

          {isEditable ? (
            <AssignmentRoom
              submissionId={latest.id}
              assignmentId={assignment.id}
              questions={assignment.questions.map((q) => ({ id: q.id, order: q.order, text: q.text, points: q.points }))}
              initialAnswers={Object.fromEntries(latest.answers.map((a) => [a.questionId, a.answerText ?? ""]))}
              initialFiles={latest.files.map((f) => ({ id: f.id, fileName: f.fileName, url: f.url }))}
            />
          ) : (
            <div className="lms-panel space-y-4">
              <p className="lms-panel-title">
                {latest.status === "GRADED" ? "Your answers" : "Submitted — waiting for grading"}
              </p>
              {assignment.questions.map((question, index) => {
                const answer = latest.answers.find((a) => a.questionId === question.id);
                return (
                  <div key={question.id} className="lms-attempt">
                    <p className="font-bold">
                      {index + 1}. {question.text} <span className="font-normal text-muted-foreground">({question.points} pts)</span>
                    </p>
                    <p className="mt-2 whitespace-pre-wrap">
                      {answer?.answerText || <em className="text-muted-foreground">No answer given</em>}
                    </p>
                  </div>
                );
              })}
              {latest.files.length > 0 && (
                <ul className="lms-table-actions">
                  {latest.files.map((file) => (
                    <li key={file.id}><a href={file.url} target="_blank" rel="noreferrer">{file.fileName}</a></li>
                  ))}
                </ul>
              )}

              {latest.status === "GRADED" && (
                <div className="lms-notice-banner lms-notice-info">
                  <div>
                    <p className="font-bold">Score: {latest.score}/{latest.maxScore}</p>
                    {latest.feedback && <p className="mt-1">Feedback: {latest.feedback}</p>}
                    {latest.gradedAt && <p className="mt-1 text-xs">Graded {latest.gradedAt.toLocaleString()}</p>}
                  </div>
                </div>
              )}
            </div>
          )}

          {priorAttempts.length > 0 && (
            <div className="lms-attempt-history">
              <p className="lms-panel-title">Attempt history</p>
              {priorAttempts.map((attempt) => (
                <div key={attempt.id} className="lms-attempt">
                  <p className="flex items-center gap-2 font-bold">
                    Attempt #{attempt.attemptNumber} <StatusBadge status={attempt.status} />
                  </p>
                  {attempt.score != null && <p className="mt-1 text-xs">Score: {attempt.score}/{attempt.maxScore}</p>}
                  {attempt.feedback && <p className="mt-1 text-xs">Feedback: {attempt.feedback}</p>}
                  {attempt.resubmissionReason && <p className="mt-1 text-xs">Reason: {attempt.resubmissionReason}</p>}
                </div>
              ))}
            </div>
          )}

          <CommentThread
            targetType="ASSIGNMENT"
            targetId={assignment.id}
            comments={commentData}
            currentUserId={session.userId}
            canModerate={false}
          />
        </div>
      </AppShell>
    </AuthGate>
  );
}
