import { prisma } from "@/lib/prisma";

/** Server-only helpers shared between the exam room page and the exam server actions. */

export function getDeadline(startedAt: Date, durationMinutes: number) {
  return new Date(startedAt.getTime() + durationMinutes * 60_000);
}

export function isExpired(startedAt: Date, durationMinutes: number) {
  return Date.now() > getDeadline(startedAt, durationMinutes).getTime();
}

/** Returns the existing attempt for a registration, or creates one and flips the registration to IN_PROGRESS. */
export async function ensureAttemptForRegistration(registrationId: string, studentId: string) {
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { attempt: true },
  });
  if (!registration || registration.studentId !== studentId) return null;
  if (registration.attempt) return registration.attempt;

  return prisma.$transaction(async (tx) => {
    const attempt = await tx.examAttempt.create({ data: { registrationId } });
    await tx.registration.update({ where: { id: registrationId }, data: { status: "IN_PROGRESS" } });
    return attempt;
  });
}

/** Grades every question for an attempt (missing answers count as wrong) and marks it submitted. Idempotent. */
export async function gradeAndSubmitAttempt(attemptId: string) {
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      registration: { include: { competition: { include: { questions: true } } } },
      answers: true,
    },
  });
  if (!attempt) throw new Error("Attempt not found");
  if (attempt.status === "SUBMITTED") return attempt;

  const answersByQuestion = new Map(attempt.answers.map((a) => [a.questionId, a]));
  let score = 0;
  let totalPoints = 0;

  await prisma.$transaction(async (tx) => {
    for (const question of attempt.registration.competition.questions) {
      totalPoints += question.points;
      const existing = answersByQuestion.get(question.id);
      const selectedIndex = existing?.selectedIndex ?? null;
      const isCorrect = selectedIndex !== null && selectedIndex === question.correctIndex;
      if (isCorrect) score += question.points;

      await tx.answer.upsert({
        where: { attemptId_questionId: { attemptId, questionId: question.id } },
        create: { attemptId, questionId: question.id, selectedIndex, isCorrect },
        update: { isCorrect },
      });
    }

    await tx.examAttempt.update({
      where: { id: attemptId },
      data: { status: "SUBMITTED", submittedAt: new Date(), score, totalPoints },
    });
    await tx.registration.update({
      where: { id: attempt.registrationId },
      data: { status: "COMPLETED" },
    });
  });

  return prisma.examAttempt.findUniqueOrThrow({ where: { id: attemptId } });
}
