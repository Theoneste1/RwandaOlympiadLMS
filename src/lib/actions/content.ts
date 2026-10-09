"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { saveUploadedFile } from "@/lib/uploads";
import { notifyMany } from "@/lib/notify";
import type { ActionState } from "@/lib/actions/auth";
import type { ContentType } from "@prisma/client";

type State = ActionState & { success?: string };

const CONTENT_TYPES: ContentType[] = ["LESSON", "VIDEO", "NOTE", "WORKSHEET", "PROBLEM_SET"];

async function requireOwnedClass(classId: string, teacherId: string) {
  const classRow = await prisma.class.findUnique({ where: { id: classId } });
  if (!classRow || classRow.teacherId !== teacherId) return null;
  return classRow;
}

async function uploadAttachmentIfPresent(formData: FormData): Promise<{ url?: string; error?: string }> {
  const file = formData.get("attachment");
  if (!(file instanceof File) || file.size === 0) return {};
  const result = await saveUploadedFile(file, "content");
  if (!result.ok) return { error: result.error };
  return { url: result.url };
}

export async function createContentAction(_prevState: State, formData: FormData): Promise<State> {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") {
    return { error: "You must be logged in as a teacher to do that." };
  }

  const classId = String(formData.get("classId") ?? "");
  const type = String(formData.get("type") ?? "") as ContentType;
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const publish = formData.get("intent") === "publish";

  if (!classId || !CONTENT_TYPES.includes(type) || !title || !body) {
    return { error: "Fill in a class, type, title, and body." };
  }

  const classRow = await requireOwnedClass(classId, session.userId);
  if (!classRow) return { error: "You can only add content to your own classes." };

  const attachment = await uploadAttachmentIfPresent(formData);
  if (attachment.error) return { error: attachment.error };

  const created = await prisma.content.create({
    data: {
      classId,
      authorId: session.userId,
      type,
      title,
      body,
      attachmentUrl: attachment.url,
      status: publish ? "PUBLISHED" : "DRAFT",
      publishedAt: publish ? new Date() : null,
      publishedById: publish ? session.userId : null,
    },
  });

  if (publish) {
    const enrollments = await prisma.classEnrollment.findMany({ where: { classId }, select: { studentId: true } });
    await notifyMany(
      enrollments.map((e) => e.studentId),
      "CONTENT_PUBLISHED",
      `New ${type.toLowerCase().replace("_", " ")} published: ${title}`,
      `/student/content/${created.id}`,
    );
  }

  revalidatePath("/teacher/resources");
  redirect(`/teacher/content/${created.id}`);
}

export async function updateContentAction(_prevState: State, formData: FormData): Promise<State> {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") {
    return { error: "You must be logged in as a teacher to do that." };
  }

  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const type = String(formData.get("type") ?? "") as ContentType;

  if (!title || !body || !CONTENT_TYPES.includes(type)) {
    return { error: "Fill in a type, title, and body." };
  }

  const content = await prisma.content.findUnique({ where: { id }, include: { class: true } });
  if (!content || content.class.teacherId !== session.userId) {
    return { error: "You can only edit your own content." };
  }

  const attachment = await uploadAttachmentIfPresent(formData);
  if (attachment.error) return { error: attachment.error };

  await prisma.content.update({
    where: { id },
    data: { title, body, type, attachmentUrl: attachment.url ?? content.attachmentUrl },
  });

  revalidatePath("/teacher/resources");
  revalidatePath(`/teacher/content/${id}`);
  redirect(`/teacher/content/${id}`);
}

async function requireOwnedContent(id: string, teacherId: string) {
  const content = await prisma.content.findUnique({ where: { id }, include: { class: true } });
  if (!content || content.class.teacherId !== teacherId) return null;
  return content;
}

export async function publishContentAction(_prevState: State, formData: FormData): Promise<State> {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") {
    return { error: "You must be logged in as a teacher to do that." };
  }

  const id = String(formData.get("id") ?? "");
  const content = await requireOwnedContent(id, session.userId);
  if (!content) return { error: "You can only publish your own content." };

  await prisma.content.update({
    where: { id },
    data: { status: "PUBLISHED", publishedAt: new Date(), publishedById: session.userId },
  });

  const enrollments = await prisma.classEnrollment.findMany({
    where: { classId: content.classId },
    select: { studentId: true },
  });
  await notifyMany(
    enrollments.map((e) => e.studentId),
    "CONTENT_PUBLISHED",
    `New ${content.type.toLowerCase().replace("_", " ")} published: ${content.title}`,
    `/student/content/${content.id}`,
  );

  revalidatePath("/teacher/resources");
  revalidatePath(`/teacher/content/${id}`);
  return { success: "Published." };
}

export async function unpublishContentAction(_prevState: State, formData: FormData): Promise<State> {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") {
    return { error: "You must be logged in as a teacher to do that." };
  }

  const id = String(formData.get("id") ?? "");
  const content = await requireOwnedContent(id, session.userId);
  if (!content) return { error: "You can only unpublish your own content." };

  await prisma.content.update({ where: { id }, data: { status: "DRAFT" } });

  revalidatePath("/teacher/resources");
  revalidatePath(`/teacher/content/${id}`);
  return { success: "Moved back to draft." };
}

export async function archiveContentAction(_prevState: State, formData: FormData): Promise<State> {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") {
    return { error: "You must be logged in as a teacher to do that." };
  }

  const id = String(formData.get("id") ?? "");
  const content = await requireOwnedContent(id, session.userId);
  if (!content) return { error: "You can only archive your own content." };

  await prisma.content.update({ where: { id }, data: { status: "ARCHIVED" } });

  revalidatePath("/teacher/resources");
  revalidatePath(`/teacher/content/${id}`);
  return { success: "Archived." };
}
