"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export type ShellNotification = {
  id: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

export type ShellData = {
  name: string;
  role: "STUDENT" | "TEACHER";
  email: string;
  studentIdNumber: string | null;
  grade: string | null;
  notifications: ShellNotification[];
  unreadCount: number;
};

/** Everything the app chrome (AppShell) needs about the signed-in user — one call, read-only. */
export async function getShellDataAction(): Promise<ShellData | null> {
  const session = await getSession();
  if (!session) return null;

  const [user, notifications, unreadCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId } }),
    prisma.notification.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.notification.count({ where: { userId: session.userId, read: false } }),
  ]);
  if (!user) return null;

  return {
    name: session.name,
    role: session.role,
    email: user.email,
    studentIdNumber: user.studentIdNumber,
    grade: user.grade,
    notifications: notifications.map((n) => ({
      id: n.id,
      message: n.message,
      link: n.link,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    })),
    unreadCount,
  };
}

export async function markNotificationReadAction(id: string): Promise<{ ok: boolean }> {
  const session = await getSession();
  if (!session) return { ok: false };

  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification || notification.userId !== session.userId) return { ok: false };

  await prisma.notification.update({ where: { id }, data: { read: true } });
  revalidatePath("/");
  return { ok: true };
}

export async function markAllNotificationsReadAction(): Promise<{ ok: boolean }> {
  const session = await getSession();
  if (!session) return { ok: false };

  await prisma.notification.updateMany({ where: { userId: session.userId, read: false }, data: { read: true } });
  return { ok: true };
}
