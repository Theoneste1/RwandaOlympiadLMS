"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { saveUploadedFile, removeUploadedFile } from "@/lib/uploads";
import { notifyMany, createNotification } from "@/lib/notify";
import { computeMaxScore, isEnrolledInClass } from "@/lib/assignments";
import type { ActionState } from "@/lib/actions/auth";

type State = ActionState & { success?: string };
type Result = { ok: true } | { ok: false; error: string };

async function requireOwnedClass(classId: string, teacherId: string) {
  const classRow = await prisma.class.findUnique({ where: { id: classId } });
  if (!classRow || classRow.teacherId !== teacherId) return null;
  return classRow;
}

async function requireOwnedAssignment(id: string, teacherId: string) {
  const assignment = await prisma.assignment.findUnique({ where: { id }, include: { class: true } });
  if (!assignment || assignment.class.teacherId !== teacherId) return null;
  return assignment;
}

async function uploadAttachmentIfPresent(formData: FormData): Promise<{ url?: string; error?: string }> {
  const file = formData.get("attachment");
  if (!(file instanceof File) || file.size === 0) return {};
  const result = await saveUploadedFile(file, "assignments");
  if (!result.ok) return { error: result.error };
  return { url: result.url };
}

function collectQuestions(formData: FormData) {
  const ids = formData.getAll("questionId").map((v) => String(v));
  const texts = formData.getAll("questionText").map((v) => String(v).trim());
  const points = formData.getAll("questionPoints").map((v) => Math.max(1, Number(v) || 1));
  return texts
    .map((text, i) => ({ id: ids[i] || null, text, points: points[i] ?? 1 }))
    .filter((q) => q.text.length > 0);
}

export async function createAssignmentAction(_prevState: State, formData: FormData): Promise<State> {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") {
    return { error: "You must be logged in as a teacher to do that." };
  }

  const classId = String(formData.get("classId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const instructions = String(formData.get("instructions") ?? "").trim();
  const dueAtRaw = String(formData.get("dueAt") ?? "");
  const dueAt = dueAtRaw ? new Date(dueAtRaw) : null;
  const publish = formData.get("intent") === "publish";

  if (!classId || !title || !instructions) {
    return { error: "Fill in a class, title, and instructions." };
  }

  const classRow = await requireOwnedClass(classId, session.userId);
  if (!classRow) return { error: "You can only create assignments for your own classes." };

  const questions = collectQuestions(formData);
  if (questions.length === 0) return { error: "Add at least one question." };

  const attachment = await uploadAttachmentIfPresent(formData);
  if (attachment.error) return { error: attachment.error };

  const created = await prisma.assignment.create({
    data: {
      classId,
      authorId: session.userId,
      title,
      instructions,
      dueAt,
      attachmentUrl: attachment.url,
      status: publish ? "PUBLISHED" : "DRAFT",
      publishedAt: publish ? new Date() : null,
      publishedById: publish ? session.userId : null,
      questions: { create: questions.map((q, order) => ({ text: q.text, points: q.points, order })) },
    },
  });

  if (publish) {
    const enrollments = await prisma.classEnrollment.findMany({ where: { classId }, select: { studentId: true } });
    await notifyMany(
      enrollments.map((e) => e.studentId),
      "ASSIGNMENT_PUBLISHED",
      `New assignment published: ${title}`,
      `/student/assignments/${created.id}`,
    );
  }

  revalidatePath("/teacher/assignments");
  redirect(`/teacher/assignments/${created.id}`);
}

export async function updateAssignmentAction(_prevState: State, formData: FormData): Promise<State> {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") {
    return { error: "You must be logged in as a teacher to do that." };
  }

  const id = String(formData.get("id") ?? "");
  const assignment = await prisma.assignment.findUnique({ where: { id }, include: { class: true, questions: true } });
  if (!assignment || assignment.class.teacherId !== session.userId) {
    return { error: "You can only edit your own assignments." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const instructions = String(formData.get("instructions") ?? "").trim();
  const dueAtRaw = String(formData.get("dueAt") ?? "");
  const dueAt = dueAtRaw ? new Date(dueAtRaw) : null;

  if (!title || !instructions) return { error: "Title and instructions are required." };

  const questions = collectQuestions(formData);
  if (questions.length === 0) return { error: "Add at least one question." };

  const attachment = await uploadAttachmentIfPresent(formData);
  if (attachment.error) return { error: attachment.error };

  const keptIds = new Set(questions.map((q) => q.id).filter(Boolean) as string[]);
  const removable = assignment.questions.filter((q) => !keptIds.has(q.id));

  await prisma.$transaction(async (tx) => {
    await tx.assignment.update({
      where: { id },
      data: { title, instructions, dueAt, attachmentUrl: attachment.url ?? assignment.attachmentUrl },
    });

    for (const q of removable) {
      const answerCount = await tx.assignmentAnswer.count({ where: { questionId: q.id } });
      // A question a student already answered can't be deleted without losing their answer history.
      if (answerCount === 0) await tx.assignmentQuestion.delete({ where: { id: q.id } });
    }

    for (let order = 0; order < questions.length; order++) {
      const q = questions[order];
      if (q.id) {
        await tx.assignmentQuestion.update({ where: { id: q.id }, data: { text: q.text, points: q.points, order } });
      } else {
        await tx.assignmentQuestion.create({ data: { assignmentId: id, text: q.text, points: q.points, order } });
      }
    }
  });

  revalidatePath("/teacher/assignments");
  revalidatePath(`/teacher/assignments/${id}`);
  redirect(`/teacher/assignments/${id}`);
}

export async function publishAssignmentAction(_prevState: State, formData: FormData): Promise<State> {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") {
    return { error: "You must be logged in as a teacher to do that." };
  }

  const id = String(formData.get("id") ?? "");
  const assignment = await requireOwnedAssignment(id, session.userId);
  if (!assignment) return { error: "You can only publish your own assignments." };

  await prisma.assignment.update({
    where: { id },
    data: { status: "PUBLISHED", publishedAt: new Date(), publishedById: session.userId },
  });

  const enrollments = await prisma.classEnrollment.findMany({
    where: { classId: assignment.classId },
    select: { studentId: true },
  });
  await notifyMany(
    enrollments.map((e) => e.studentId),
    "ASSIGNMENT_PUBLISHED",
    `New assignment published: ${assignment.title}`,
    `/student/assignments/${id}`,
  );

  revalidatePath("/teacher/assignments");
  revalidatePath(`/teacher/assignments/${id}`);
  return { success: "Published." };
}

export async function archiveAssignmentAction(_prevState: State, formData: FormData): Promise<State> {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") {
    return { error: "You must be logged in as a teacher to do that." };
  }

  const id = String(formData.get("id") ?? "");
  const assignment = await requireOwnedAssignment(id, session.userId);
  if (!assignment) return { error: "You can only archive your own assignments." };

  await prisma.assignment.update({ where: { id }, data: { status: "ARCHIVED" } });

  revalidatePath("/teacher/assignments");
  revalidatePath(`/teacher/assignments/${id}`);
  return { success: "Archived." };
}

export async function saveAssignmentAnswerAction(
  submissionId: string,
  questionId: string,
  answerText: string,
): Promise<Result> {
  const session = await getSession();
  if (!session || session.role !== "STUDENT") return { ok: false, error: "You must be logged in as a student." };

  const submission = await prisma.assignmentSubmission.findUnique({
    where: { id: submissionId },
    include: { assignment: true },
  });
  if (!submission || submission.studentId !== session.userId) return { ok: false, error: "Submission not found." };
  if (submission.status !== "IN_PROGRESS") return { ok: false, error: "This submission can no longer be edited." };
  if (submission.assignment.status !== "PUBLISHED") return { ok: false, error: "This assignment is no longer available." };

  const enrolled = await isEnrolledInClass(submission.assignment.classId, session.userId);
  if (!enrolled) return { ok: false, error: "You are not enrolled in this class." };

  await prisma.assignmentAnswer.upsert({
    where: { submissionId_questionId: { submissionId, questionId } },
    create: { submissionId, questionId, answerText },
    update: { answerText },
  });

  return { ok: true };
}

export async function uploadSubmissionFileAction(
  submissionId: string,
  file: File,
): Promise<{ ok: true; file: { id: string; fileName: string; url: string } } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "STUDENT") return { ok: false, error: "You must be logged in as a student." };

  const submission = await prisma.assignmentSubmission.findUnique({ where: { id: submissionId } });
  if (!submission || submission.studentId !== session.userId) return { ok: false, error: "Submission not found." };
  if (submission.status !== "IN_PROGRESS") return { ok: false, error: "This submission can no longer be edited." };

  const saved = await saveUploadedFile(file, "submissions");
  if (!saved.ok) return { ok: false, error: saved.error };

  const record = await prisma.submissionFile.create({ data: { submissionId, fileName: saved.fileName, url: saved.url } });

  revalidatePath(`/student/assignments/${submission.assignmentId}`);
  return { ok: true, file: { id: record.id, fileName: record.fileName, url: record.url } };
}

export async function removeSubmissionFileAction(fileId: string): Promise<Result> {
  const session = await getSession();
  if (!session || session.role !== "STUDENT") return { ok: false, error: "You must be logged in as a student." };

  const file = await prisma.submissionFile.findUnique({ where: { id: fileId }, include: { submission: true } });
  if (!file || file.submission.studentId !== session.userId) return { ok: false, error: "File not found." };
  if (file.submission.status !== "IN_PROGRESS") return { ok: false, error: "This submission can no longer be edited." };

  await removeUploadedFile(file.url);
  await prisma.submissionFile.delete({ where: { id: fileId } });

  revalidatePath(`/student/assignments/${file.submission.assignmentId}`);
  return { ok: true };
}

export async function submitAssignmentAction(submissionId: string): Promise<Result> {
  const session = await getSession();
  if (!session || session.role !== "STUDENT") return { ok: false, error: "You must be logged in as a student." };

  const submission = await prisma.assignmentSubmission.findUnique({
    where: { id: submissionId },
    include: { assignment: { include: { class: true } } },
  });
  if (!submission || submission.studentId !== session.userId) return { ok: false, error: "Submission not found." };
  if (submission.status !== "IN_PROGRESS") return { ok: false, error: "This submission was already submitted." };

  const maxScore = await computeMaxScore(submission.assignmentId);

  await prisma.assignmentSubmission.update({
    where: { id: submissionId },
    data: { status: "PENDING_GRADING", submittedAt: new Date(), maxScore },
  });

  const student = await prisma.user.findUnique({ where: { id: session.userId } });
  await createNotification(
    submission.assignment.class.teacherId,
    "NEW_SUBMISSION",
    `${student?.name ?? "A student"} submitted "${submission.assignment.title}"`,
    `/teacher/assignments/${submission.assignmentId}/submissions/${submissionId}`,
  );

  revalidatePath(`/student/assignments/${submission.assignmentId}`);
  revalidatePath(`/teacher/assignments/${submission.assignmentId}`);
  return { ok: true };
}

export async function gradeSubmissionAction(_prevState: State, formData: FormData): Promise<State> {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") {
    return { error: "You must be logged in as a teacher to do that." };
  }

  const submissionId = String(formData.get("submissionId") ?? "");
  const scoreRaw = String(formData.get("score") ?? "");
  const feedback = String(formData.get("feedback") ?? "").trim();

  const submission = await prisma.assignmentSubmission.findUnique({
    where: { id: submissionId },
    include: { assignment: { include: { class: true } } },
  });
  if (!submission || submission.assignment.class.teacherId !== session.userId) {
    return { error: "You can only grade submissions for your own classes." };
  }
  if (submission.status !== "PENDING_GRADING" && submission.status !== "GRADED") {
    return { error: "This submission hasn't been submitted yet." };
  }

  const score = Number(scoreRaw);
  if (!Number.isFinite(score) || score < 0) return { error: "Enter a valid score." };

  const maxScore = submission.maxScore ?? (await computeMaxScore(submission.assignmentId));

  await prisma.assignmentSubmission.update({
    where: { id: submissionId },
    data: { status: "GRADED", score, maxScore, feedback: feedback || null, gradedAt: new Date(), gradedById: session.userId },
  });

  await createNotification(
    submission.studentId,
    "GRADED",
    `Your submission for "${submission.assignment.title}" was graded: ${score}/${maxScore}`,
    `/student/assignments/${submission.assignmentId}`,
  );

  revalidatePath(`/teacher/assignments/${submission.assignmentId}/submissions/${submissionId}`);
  revalidatePath(`/teacher/assignments/${submission.assignmentId}`);
  revalidatePath(`/student/assignments/${submission.assignmentId}`);
  return { success: "Graded." };
}

export async function requestResubmissionAction(_prevState: State, formData: FormData): Promise<State> {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") {
    return { error: "You must be logged in as a teacher to do that." };
  }

  const submissionId = String(formData.get("submissionId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return { error: "Explain what the student should fix." };

  const submission = await prisma.assignmentSubmission.findUnique({
    where: { id: submissionId },
    include: { assignment: { include: { class: true } } },
  });
  if (!submission || submission.assignment.class.teacherId !== session.userId) {
    return { error: "You can only act on submissions for your own classes." };
  }
  if (submission.status !== "PENDING_GRADING" && submission.status !== "GRADED") {
    return { error: "This submission hasn't been submitted yet." };
  }

  await prisma.assignmentSubmission.update({
    where: { id: submissionId },
    data: { status: "RESUBMISSION_REQUIRED", resubmissionReason: reason },
  });

  await createNotification(
    submission.studentId,
    "RESUBMISSION_REQUESTED",
    `Resubmission requested for "${submission.assignment.title}"`,
    `/student/assignments/${submission.assignmentId}`,
  );

  revalidatePath(`/teacher/assignments/${submission.assignmentId}/submissions/${submissionId}`);
  revalidatePath(`/teacher/assignments/${submission.assignmentId}`);
  revalidatePath(`/student/assignments/${submission.assignmentId}`);
  return { success: "Resubmission requested." };
}
