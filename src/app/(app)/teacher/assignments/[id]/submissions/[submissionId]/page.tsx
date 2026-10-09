import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell, AuthGate } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { GradingPanel } from "@/components/grading-panel";
import { CommentThread, type CommentWithAuthor } from "@/components/comment-thread";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Grade Submission" };

export default async function GradeSubmissionPage({
  params,
}: {
  params: Promise<{ id: string; submissionId: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") redirect("/login");

  const { id, submissionId } = await params;
  const submission = await prisma.assignmentSubmission.findUnique({
    where: { id: submissionId },
    include: {
      assignment: { include: { class: true, questions: { orderBy: { order: "asc" } } } },
      student: true,
      answers: true,
      files: true,
    },
  });
  if (!submission || submission.assignmentId !== id || submission.assignment.class.teacherId !== session.userId) {
    notFound();
  }

  const priorAttempts = await prisma.assignmentSubmission.findMany({
    where: { assignmentId: id, studentId: submission.studentId, NOT: { id: submission.id } },
    orderBy: { attemptNumber: "desc" },
  });

  const answersByQuestion = new Map(submission.answers.map((answer) => [answer.questionId, answer]));
  const maxScore = submission.maxScore ?? submission.assignment.questions.reduce((sum, q) => sum + q.points, 0);

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
    <AuthGate role="teacher">
      <AppShell role="teacher">
        <div className="lms-page space-y-6 p-1">
          <section className="lms-banner">
            <div>
              <p className="lms-banner-kicker">{submission.assignment.class.name} · {submission.assignment.title}</p>
              <h1>{submission.student.name}&apos;s submission</h1>
              <p>
                Attempt #{submission.attemptNumber}
                {submission.submittedAt ? ` · Submitted ${submission.submittedAt.toLocaleString()}` : ""}
              </p>
            </div>
            <div className="lms-banner-actions">
              <StatusBadge status={submission.status} />
            </div>
          </section>

          <Link href={`/teacher/assignments/${id}`} className="lms-btn lms-btn-ghost inline-flex w-fit">
            ← Back to roster
          </Link>

          <div className="lms-panel space-y-4">
            <p className="lms-panel-title">Answers</p>
            {submission.assignment.questions.map((question, index) => {
              const answer = answersByQuestion.get(question.id);
              return (
                <div key={question.id} className="lms-attempt">
                  <p className="font-bold">
                    {index + 1}. {question.text}{" "}
                    <span className="font-normal text-muted-foreground">({question.points} pts)</span>
                  </p>
                  <p className="mt-2 whitespace-pre-wrap">
                    {answer?.answerText || <em className="text-muted-foreground">No answer given</em>}
                  </p>
                </div>
              );
            })}

            {submission.files.length > 0 && (
              <div>
                <p className="lms-panel-title">Uploaded files</p>
                <ul className="lms-table-actions mt-2">
                  {submission.files.map((file) => (
                    <li key={file.id}>
                      <a href={file.url} target="_blank" rel="noreferrer">{file.fileName}</a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {submission.resubmissionReason && submission.status !== "RESUBMISSION_REQUIRED" && (
            <div className="lms-notice-banner lms-notice-warning">
              Previously requested resubmission: {submission.resubmissionReason}
            </div>
          )}

          <GradingPanel
            submissionId={submission.id}
            maxScore={maxScore}
            currentScore={submission.score}
            currentFeedback={submission.feedback}
          />

          {priorAttempts.length > 0 && (
            <div className="lms-attempt-history">
              <p className="lms-panel-title">Previous attempts</p>
              {priorAttempts.map((attempt) => (
                <div key={attempt.id} className="lms-attempt">
                  <p className="flex items-center gap-2 font-bold">
                    Attempt #{attempt.attemptNumber}
                    <StatusBadge status={attempt.status} />
                  </p>
                  {attempt.resubmissionReason && (
                    <p className="mt-1 text-xs">Reason for resubmission: {attempt.resubmissionReason}</p>
                  )}
                  {attempt.score != null && <p className="mt-1 text-xs">Score: {attempt.score}/{attempt.maxScore}</p>}
                  {attempt.feedback && <p className="mt-1 text-xs">Feedback: {attempt.feedback}</p>}
                </div>
              ))}
            </div>
          )}

          <CommentThread
            targetType="ASSIGNMENT"
            targetId={id}
            comments={commentData}
            currentUserId={session.userId}
            canModerate
          />
        </div>
      </AppShell>
    </AuthGate>
  );
}
