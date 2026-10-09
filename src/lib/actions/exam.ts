"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { gradeAndSubmitAttempt, isExpired } from "@/lib/exam";

type SaveAnswerResult = { ok: true } | { ok: false; expired?: boolean; error: string };

export async function saveAnswerAction(
  attemptId: string,
  questionId: string,
  selectedIndex: number,
): Promise<SaveAnswerResult> {
  const session = await getSession();
  if (!session || session.role !== "STUDENT") {
    return { ok: false, error: "Not authenticated." };
  }

  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: { registration: { include: { competition: true } } },
  });
  if (!attempt || attempt.registration.studentId !== session.userId) {
    return { ok: false, error: "Exam attempt not found." };
  }
  if (attempt.status === "SUBMITTED") {
    return { ok: false, error: "This exam has already been submitted." };
  }

  if (isExpired(attempt.startedAt, attempt.registration.competition.durationMinutes)) {
    await gradeAndSubmitAttempt(attemptId);
    return { ok: false, expired: true, error: "Time is up — your exam was submitted automatically." };
  }

  await prisma.answer.upsert({
    where: { attemptId_questionId: { attemptId, questionId } },
    create: { attemptId, questionId, selectedIndex },
    update: { selectedIndex },
  });

  return { ok: true };
}

type SubmitResult = { ok: true; attemptId: string } | { ok: false; error: string };

export async function submitExamAction(attemptId: string): Promise<SubmitResult> {
  const session = await getSession();
  if (!session || session.role !== "STUDENT") {
    return { ok: false, error: "Not authenticated." };
  }

  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: { registration: true },
  });
  if (!attempt || attempt.registration.studentId !== session.userId) {
    return { ok: false, error: "Exam attempt not found." };
  }

  await gradeAndSubmitAttempt(attemptId);
  revalidatePath("/student");
  return { ok: true, attemptId };
}
