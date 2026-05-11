import prisma from "../../lib/prisma";
import type { NotificationType } from "@prisma/client";

export interface CreateNotificationData {
  type: NotificationType;
  title: string;
  message: string;
  demandId?: number;
  projectName?: string;
}

export const notificationService = {
  async createForUser(username: string, data: CreateNotificationData) {
    return prisma.notification.create({
      data: {
        ...data,
        recipientUsername: username,
        isAdminBroadcast: false,
      },
    });
  },

  async createAdminBroadcast(data: CreateNotificationData) {
    return prisma.notification.create({
      data: {
        ...data,
        isAdminBroadcast: true,
      },
    });
  },

  async getUserNotifications(
    username: string,
    isAdmin: boolean,
    page: number,
    limit: number
  ) {
    const where = {
      OR: [
        { recipientUsername: username },
        ...(isAdmin ? [{ isAdminBroadcast: true }] : []),
      ],
    };

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    const enriched = notifications.map((n) => ({
      ...n,
      isRead: n.recipientUsername
        ? n.isRead
        : n.readByUsernames.includes(username),
    }));

    const unreadCount = enriched.filter((n) => !n.isRead).length;

    return { data: enriched, meta: { total, unreadCount } };
  },

  async markRead(id: number, username: string) {
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) throw new Error("Notification not found");

    if (notification.recipientUsername) {
      return prisma.notification.update({
        where: { id },
        data: { isRead: true },
      });
    } else {
      if (notification.readByUsernames.includes(username)) return notification;
      return prisma.notification.update({
        where: { id },
        data: { readByUsernames: { push: username } },
      });
    }
  },

  async markAllRead(username: string, isAdmin: boolean) {
    await prisma.notification.updateMany({
      where: { recipientUsername: username, isRead: false },
      data: { isRead: true },
    });

    if (isAdmin) {
      // Batch-append username to readByUsernames for all unread admin broadcasts in one SQL round-trip
      await prisma.$executeRaw`
        UPDATE "Notification"
        SET "readByUsernames" = array_append("readByUsernames", ${username})
        WHERE "isAdminBroadcast" = true
        AND NOT (${username} = ANY("readByUsernames"))
      `;
    }
  },
};
