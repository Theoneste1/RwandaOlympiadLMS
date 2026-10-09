"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { ActionState } from "@/lib/actions/auth";

type State = ActionState & { success?: string };

/**
 * There's no separate Admin role in the schema (see Role enum: STUDENT | TEACHER) — the admin
 * area is a platform-wide view any signed-in teacher can open. A real multi-tenant admin role
 * would need a schema change, which is out of scope here; this just gates on "is a teacher".
 */
async function requireStaff() {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") return null;
  return session;
}

export async function updateUserProfileAction(_prevState: State, formData: FormData): Promise<State> {
  const session = await requireStaff();
  if (!session) return { error: "You must be signed in to do that." };

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const grade = String(formData.get("grade") ?? "").trim();

  if (!id || !name) return { error: "Name is required." };

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return { error: "User not found." };

  await prisma.user.update({ where: { id }, data: { name, grade: grade || null } });

  revalidatePath("/admin/users");
  revalidatePath("/admin/students");
  return { success: `Updated ${name}.` };
}
