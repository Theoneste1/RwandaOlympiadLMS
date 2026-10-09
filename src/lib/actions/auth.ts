"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { signSessionToken, SESSION_COOKIE, SESSION_COOKIE_MAX_AGE } from "@/lib/auth";
import { generateUsername } from "@/lib/username";
import type { Role } from "@prisma/client";

export type ActionState = { error?: string };

async function createSession(user: { id: string; role: Role; name: string }) {
  const token = await signSessionToken({ userId: user.id, role: user.role, name: user.name });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE,
  });
}

export async function loginAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if ((username && !password) || (!username && password)) {
    return { error: "Enter your username and password." };
  }

  const user = username
    ? await prisma.user.findUnique({ where: { username } })
    : await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) {
    return { error: "Invalid username or password." };
  }

  if (username) {
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return { error: "Invalid username or password." };
    }
  }

  await createSession(user);
  redirect(user.role === "TEACHER" ? "/teacher" : "/student");
}

export async function registerAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const name = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const roleInput = String(formData.get("role") ?? "");
  const role: Role = roleInput === "Teacher" ? "TEACHER" : "STUDENT";

  if (!name || !email || !password) {
    return { error: "All fields are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with that email already exists." };
  }

  const username = await generateUsername(name);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      username,
      role,
      passwordHash: await hashPassword(password),
    },
  });

  await createSession(user);
  redirect(user.role === "TEACHER" ? "/teacher" : "/student");
}

export async function logoutAction() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}

/**
 * One-click demo access: signs in as the seeded `teacher1`/`student1` accounts with a real
 * session (same cookie real login sets), rather than the old localStorage role-picker. "admin"
 * reuses the teacher account and lands on /admin — there's no separate Admin role in the schema.
 */
export async function demoLoginAction(demoRole: "STUDENT" | "TEACHER" | "ADMIN") {
  const username = demoRole === "STUDENT" ? "student1" : "teacher1";
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    redirect("/login?demoError=1");
  }

  await createSession(user);
  redirect(demoRole === "STUDENT" ? "/student" : demoRole === "ADMIN" ? "/admin" : "/teacher");
}
