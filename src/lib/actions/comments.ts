"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession, type SessionPayload } from "@/lib/auth";
import { isEnrolledInClass } from "@/lib/assignments";
import { createNotification } from "@/lib/notify";
import type { ActionState } from "@/lib/actions/auth";
import type { CommentTarget } from "@prisma/client";

type State = ActionState & { success?: string };

async function resolveTarget(targetType: CommentTarget, targetId: string) {
  if (targetType === "CONTENT") {
    const content = await prisma.content.findUnique({ where: { id: targetId }, include: { class: true } });
    if (!content) return null;
    return {
      title: content.title,
      classId: content.classId,
      teacherId: content.class.teacherId,
      status: content.status,
      studentPath: `/student/content/${targetId}`,
      teacherPath: `/teacher/content/${targetId}`,
    };
  }
  const assignment = await prisma.assignment.findUnique({ where: { id: targetId }, include: { class: true } });
  if (!assignment) return null;
  return {
    title: assignment.title,
    classId: assignment.classId,
    teacherId: assignment.class.teacherId,
    status: assignment.status,
    studentPath: `/student/assignments/${targetId}`,
    teacherPath: `/teacher/assignments/${targetId}`,
  };
}

type Target = NonNullable<Awaited<ReturnType<typeof resolveTarget>>>;

async function canAccess(session: SessionPayload, target: Target) {
  if (session.role === "TEACHER") return target.teacherId === session.userId;
  if (target.status !== "PUBLISHED") return false;
  return isEnrolledInClass(target.classId, session.userId);
}

function revalidateTarget(target: Target) {
  revalidatePath(target.studentPath);
  revalidatePath(target.teacherPath);
}

export async function postCommentAction(_prevState: State, formData: FormData): Promise<State> {
  const session = await getSession();
  if (!session) return { error: "You must be logged in to comment." };

  const targetType = String(formData.get("targetType") ?? "") as CommentTarget;
  const targetId = String(formData.get("targetId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const parentId = String(formData.get("parentId") ?? "") || null;

  if (!body) return { error: "Write a comment first." };
  if (targetType !== "CONTENT" && targetType !== "ASSIGNMENT") return { error: "Invalid comment target." };

  const target = await resolveTarget(targetType, targetId);
  if (!target) return { error: "That item no longer exists." };
  if (!(await canAccess(session, target))) return { error: "You don't have access to comment here." };

  await prisma.comment.create({ data: { targetType, targetId, authorId: session.userId, body, parentId } });

  if (parentId) {
    const parent = await prisma.comment.findUnique({ where: { id: parentId } });
    if (parent && parent.authorId !== session.userId) {
      const path = session.role === "STUDENT" ? target.teacherPath : target.studentPath;
      await createNotification(parent.authorId, "COMMENT_REPLY", `New reply on "${target.title}"`, path);
    }
  } else if (session.role === "STUDENT" && target.teacherId !== session.userId) {
    await createNotification(target.teacherId, "COMMENT_REPLY", `New comment on "${target.title}"`, target.teacherPath);
  }

  revalidateTarget(target);
  return { success: "Comment posted." };
}

export async function editCommentAction(_prevState: State, formData: FormData): Promise<State> {
  const session = await getSession();
  if (!session) return { error: "You must be logged in to do that." };

  const id = String(formData.get("id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Comment can't be empty." };

  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment || comment.authorId !== session.userId) return { error: "You can only edit your own comments." };
  if (comment.deletedAt) return { error: "This comment was deleted." };

  await prisma.comment.update({ where: { id }, data: { body } });

  const target = await resolveTarget(comment.targetType, comment.targetId);
  if (target) revalidateTarget(target);
  return { success: "Comment updated." };
}

export async function deleteCommentAction(_prevState: State, formData: FormData): Promise<State> {
  const session = await getSession();
  if (!session) return { error: "You must be logged in to do that." };

  const id = String(formData.get("id") ?? "");
  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment) return { error: "Comment not found." };

  const target = await resolveTarget(comment.targetType, comment.targetId);
  const isOwningTeacher = session.role === "TEACHER" && target?.teacherId === session.userId;
  if (comment.authorId !== session.userId && !isOwningTeacher) {
    return { error: "You can only delete your own comments." };
  }

  await prisma.comment.update({ where: { id }, data: { deletedAt: new Date(), body: "" } });

  if (target) revalidateTarget(target);
  return { success: "Comment removed." };
}
