"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { ActionState } from "@/lib/actions/auth";

type State = ActionState & { success?: string };

export async function createClassAction(_prevState: State, formData: FormData): Promise<State> {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") {
    return { error: "You must be logged in as a teacher to do that." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  if (!name || !subject) {
    return { error: "Class name and subject are both required." };
  }

  await prisma.class.create({ data: { name, subject, teacherId: session.userId } });

  revalidatePath("/teacher/my-classes");
  return { success: `Created class "${name}".` };
}

export async function enrollStudentAction(_prevState: State, formData: FormData): Promise<State> {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") {
    return { error: "You must be logged in as a teacher to do that." };
  }

  const classId = String(formData.get("classId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  if (!classId || !studentId) {
    return { error: "Choose a class and a student." };
  }

  const [classRow, student] = await Promise.all([
    prisma.class.findUnique({ where: { id: classId } }),
    prisma.user.findUnique({ where: { id: studentId } }),
  ]);

  if (!classRow || classRow.teacherId !== session.userId) {
    return { error: "You can only manage your own classes." };
  }
  if (!student || student.role !== "STUDENT" || student.managedById !== session.userId) {
    return { error: "You can only enroll your own students." };
  }

  const existing = await prisma.classEnrollment.findUnique({
    where: { classId_studentId: { classId, studentId } },
  });
  if (existing) {
    return { error: `${student.name} is already enrolled in that class.` };
  }

  await prisma.classEnrollment.create({ data: { classId, studentId } });

  revalidatePath("/teacher/my-classes");
  return { success: `Enrolled ${student.name} in ${classRow.name}.` };
}

export async function unenrollStudentAction(_prevState: State, formData: FormData): Promise<State> {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") {
    return { error: "You must be logged in as a teacher to do that." };
  }

  const enrollmentId = String(formData.get("enrollmentId") ?? "");
  const enrollment = await prisma.classEnrollment.findUnique({
    where: { id: enrollmentId },
    include: { class: true, student: true },
  });
  if (!enrollment || enrollment.class.teacherId !== session.userId) {
    return { error: "You can only manage your own classes." };
  }

  await prisma.classEnrollment.delete({ where: { id: enrollmentId } });

  revalidatePath("/teacher/my-classes");
  return { success: `Removed ${enrollment.student.name} from ${enrollment.class.name}.` };
}
