import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@prisma/client";

export async function createNotification(userId: string, type: NotificationType, message: string, link?: string) {
  await prisma.notification.create({ data: { userId, type, message, link } });
}

export async function notifyMany(userIds: string[], type: NotificationType, message: string, link?: string) {
  if (userIds.length === 0) return;
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({ userId, type, message, link })),
  });
}
