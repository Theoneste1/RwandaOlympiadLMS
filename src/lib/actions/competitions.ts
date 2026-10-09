"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { ActionState } from "@/lib/actions/auth";

type State = ActionState & { success?: string };

async function generateSlug(name: string) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "competition";
  let candidate = base;
  let suffix = 1;
  while (await prisma.competition.findUnique({ where: { slug: candidate } })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

/**
 * Competition has no owning-teacher field in the schema — the question bank is shared across
 * every coach on the platform, same as the admin competition catalog already treats it. Any
 * signed-in teacher can add to it; nothing here is student-visible until a teacher registers
 * a student for it.
 */
export async function createCompetitionAction(_prevState: State, formData: FormData): Promise<State> {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") return { error: "You must be logged in as a teacher to do that." };

  const name = String(formData.get("name") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const topic = String(formData.get("topic") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const durationMinutes = Math.max(5, Number(formData.get("durationMinutes") ?? 0) || 0);

  if (!name || !subject || !topic || !summary || !durationMinutes) {
    return { error: "Fill in every field." };
  }

  const slug = await generateSlug(name);
  await prisma.competition.create({ data: { slug, name, subject, topic, summary, durationMinutes } });

  revalidatePath("/teacher/question-bank");
  return { success: `Created "${name}". Add questions to it below.` };
}

function collectChoices(formData: FormData) {
  return formData
    .getAll("choice")
    .map((v) => String(v).trim())
    .filter((v) => v.length > 0);
}

export async function addQuestionAction(_prevState: State, formData: FormData): Promise<State> {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") return { error: "You must be logged in as a teacher to do that." };

  const competitionId = String(formData.get("competitionId") ?? "");
  const text = String(formData.get("text") ?? "").trim();
  const choices = collectChoices(formData);
  const correctIndex = Number(formData.get("correctIndex") ?? -1);
  const points = Math.max(1, Number(formData.get("points") ?? 1) || 1);

  if (!competitionId || !text) return { error: "Question text is required." };
  if (choices.length < 2) return { error: "Add at least two answer choices." };
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= choices.length) {
    return { error: "Mark which choice is correct." };
  }

  const competition = await prisma.competition.findUnique({ where: { id: competitionId } });
  if (!competition) return { error: "Competition not found." };

  const count = await prisma.question.count({ where: { competitionId } });
  await prisma.question.create({
    data: { competitionId, order: count, text, choices: JSON.stringify(choices), correctIndex, points },
  });

  revalidatePath(`/teacher/question-bank/${competitionId}`);
  return { success: "Question added." };
}

export async function updateQuestionAction(_prevState: State, formData: FormData): Promise<State> {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") return { error: "You must be logged in as a teacher to do that." };

  const id = String(formData.get("id") ?? "");
  const text = String(formData.get("text") ?? "").trim();
  const choices = collectChoices(formData);
  const correctIndex = Number(formData.get("correctIndex") ?? -1);
  const points = Math.max(1, Number(formData.get("points") ?? 1) || 1);

  if (!text) return { error: "Question text is required." };
  if (choices.length < 2) return { error: "Add at least two answer choices." };
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= choices.length) {
    return { error: "Mark which choice is correct." };
  }

  const question = await prisma.question.findUnique({ where: { id } });
  if (!question) return { error: "Question not found." };

  await prisma.question.update({
    where: { id },
    data: { text, choices: JSON.stringify(choices), correctIndex, points },
  });

  revalidatePath(`/teacher/question-bank/${question.competitionId}`);
  return { success: "Question updated." };
}

export async function deleteQuestionAction(_prevState: State, formData: FormData): Promise<State> {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") return { error: "You must be logged in as a teacher to do that." };

  const id = String(formData.get("id") ?? "");
  const question = await prisma.question.findUnique({ where: { id } });
  if (!question) return { error: "Question not found." };

  const answerCount = await prisma.answer.count({ where: { questionId: id } });
  if (answerCount > 0) {
    return { error: "This question already has student answers recorded and can't be deleted." };
  }

  await prisma.question.delete({ where: { id } });

  revalidatePath(`/teacher/question-bank/${question.competitionId}`);
  return { success: "Question deleted." };
}
