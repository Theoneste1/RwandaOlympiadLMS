"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { generateUsername } from "@/lib/username";
import type { ActionState } from "@/lib/actions/auth";

export async function assignCompetitionAction(
  _prevState: ActionState & { success?: string },
  formData: FormData,
): Promise<ActionState & { success?: string }> {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") {
    return { error: "You must be logged in as a teacher to do that." };
  }

  const studentId = String(formData.get("studentId") ?? "");
  const competitionId = String(formData.get("competitionId") ?? "");
  if (!studentId || !competitionId) {
    return { error: "Choose a student and a competition." };
  }

  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (!student || student.role !== "STUDENT" || student.managedById !== session.userId) {
    return { error: "You can only assign competitions to your own students." };
  }

  const existing = await prisma.registration.findUnique({
    where: { studentId_competitionId: { studentId, competitionId } },
  });
  if (existing) {
    return { error: `${student.name} is already registered for that competition.` };
  }

  await prisma.registration.create({
    data: { studentId, competitionId, assignedById: session.userId },
  });

  revalidatePath("/teacher");
  return { success: `Assigned ${student.name} to the competition.` };
}

export async function addStudentAction(
  _prevState: ActionState & { success?: string },
  formData: FormData,
): Promise<ActionState & { success?: string }> {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") {
    return { error: "You must be logged in as a teacher to do that." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const studentIdNumber = String(formData.get("studentIdNumber") ?? "").trim().toUpperCase();
  const grade = String(formData.get("grade") ?? "").trim();

  if (!name || !studentIdNumber || !grade) {
    return { error: "Name, student ID, and grade are all required." };
  }

  const existing = await prisma.user.findUnique({ where: { studentIdNumber } });
  if (existing) {
    return { error: `Student ID ${studentIdNumber} is already in use.` };
  }

  const username = await generateUsername(name);

  await prisma.user.create({
    data: {
      name,
      studentIdNumber,
      grade,
      role: "STUDENT",
      username,
      email: `${username}@students.rwandaolympiad.example`,
      managedById: session.userId,
      // First-login convention: the student's password is their ID number.
      passwordHash: await hashPassword(studentIdNumber),
    },
  });

  revalidatePath("/teacher");
  return { success: `Added ${name}. They can log in with student ID ${studentIdNumber} as their password.` };
}
