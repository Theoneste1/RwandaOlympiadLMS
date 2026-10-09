import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureAttemptForRegistration, gradeAndSubmitAttempt, getDeadline, isExpired } from "@/lib/exam";
import { ExamRoom } from "@/components/exam-room";

export default async function ExamRoomPage({
  params,
}: {
  params: Promise<{ registrationId: string }>;
}) {
  const { registrationId } = await params;
  const session = await getSession();
  if (!session || session.role !== "STUDENT") redirect("/login");

  const attempt = await ensureAttemptForRegistration(registrationId, session.userId);
  if (!attempt) notFound();

  if (attempt.status === "SUBMITTED") {
    redirect(`/results/${attempt.id}`);
  }

  const registration = await prisma.registration.findUniqueOrThrow({
    where: { id: registrationId },
    include: {
      competition: { include: { questions: { orderBy: { order: "asc" } } } },
    },
  });

  if (isExpired(attempt.startedAt, registration.competition.durationMinutes)) {
    const finalized = await gradeAndSubmitAttempt(attempt.id);
    redirect(`/results/${finalized.id}`);
  }

  const existingAnswers = await prisma.answer.findMany({ where: { attemptId: attempt.id } });
  const initialAnswers = Object.fromEntries(
    existingAnswers.filter((a) => a.selectedIndex !== null).map((a) => [a.questionId, a.selectedIndex as number]),
  );

  const questions = registration.competition.questions.map((q) => ({
    id: q.id,
    order: q.order,
    text: q.text,
    points: q.points,
    choices: JSON.parse(q.choices) as string[],
  }));

  const deadline = getDeadline(attempt.startedAt, registration.competition.durationMinutes);

  return (
    <ExamRoom
      attemptId={attempt.id}
      competitionName={registration.competition.name}
      deadlineIso={deadline.toISOString()}
      questions={questions}
      initialAnswers={initialAnswers}
    />
  );
}
