import { prisma } from "@/lib/prisma";

/** Server-only helpers shared between assignment pages and server actions. */

/**
 * Returns the student's currently-editable submission for an assignment, creating a new
 * attempt when needed. Mirrors `ensureAttemptForRegistration` in src/lib/exam.ts.
 *
 * - No submission yet -> create attempt #1 (IN_PROGRESS).
 * - Latest is IN_PROGRESS -> return it unchanged (keep autosaving the same draft).
 * - Latest is RESUBMISSION_REQUIRED -> create a new attempt (old one is never touched again).
 * - Latest is PENDING_GRADING or GRADED -> return null (no further edits until the coach acts).
 */
export async function getOrCreateEditableSubmission(assignmentId: string, studentId: string) {
  return prisma.$transaction(async (tx) => {
    const latest = await tx.assignmentSubmission.findFirst({
      where: { assignmentId, studentId },
      orderBy: { attemptNumber: "desc" },
    });

    if (!latest) {
      return tx.assignmentSubmission.create({
        data: { assignmentId, studentId, attemptNumber: 1, status: "IN_PROGRESS" },
      });
    }

    if (latest.status === "IN_PROGRESS") return latest;

    if (latest.status === "RESUBMISSION_REQUIRED") {
      return tx.assignmentSubmission.create({
        data: { assignmentId, studentId, attemptNumber: latest.attemptNumber + 1, status: "IN_PROGRESS" },
      });
    }

    // PENDING_GRADING or GRADED: no further edits until the coach acts.
    return null;
  });
}

export async function computeMaxScore(assignmentId: string) {
  const result = await prisma.assignmentQuestion.aggregate({
    where: { assignmentId },
    _sum: { points: true },
  });
  return result._sum.points ?? 0;
}

/** True if the student is currently enrolled in the class an assignment/content item belongs to. */
export async function isEnrolledInClass(classId: string, studentId: string) {
  const enrollment = await prisma.classEnrollment.findUnique({
    where: { classId_studentId: { classId, studentId } },
  });
  return Boolean(enrollment);
}

export function isLate(submittedAt: Date | null, dueAt: Date | null) {
  if (!submittedAt || !dueAt) return false;
  return submittedAt.getTime() > dueAt.getTime();
}

/** Picks each student's highest-attemptNumber submission from an already-loaded list. */
export function latestSubmissionByStudent<T extends { studentId: string; attemptNumber: number }>(submissions: T[]) {
  const sorted = [...submissions].sort((a, b) => b.attemptNumber - a.attemptNumber);
  const latest = new Map<string, T>();
  for (const submission of sorted) {
    if (!latest.has(submission.studentId)) latest.set(submission.studentId, submission);
  }
  return latest;
}
