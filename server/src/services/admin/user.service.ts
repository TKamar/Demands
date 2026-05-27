import prisma from '../../lib/prisma';
import { UserRole } from '@prisma/client';

export const userService = {
  async getAll() {
    const [users, services] = await Promise.all([
      prisma.user.findMany({
        include: { center: { select: { name: true } } },
        orderBy: { username: 'asc' },
      }),
      prisma.service.findMany({
        where: { moderators: { isEmpty: false } },
        select: { name: true, moderators: true },
      }),
    ]);

    const moderatorMap = new Map<string, string[]>();
    for (const svc of services) {
      for (const mod of svc.moderators) {
        if (!moderatorMap.has(mod)) moderatorMap.set(mod, []);
        moderatorMap.get(mod)!.push(svc.name);
      }
    }

    return users.map((u) => ({ ...u, managedServices: moderatorMap.get(u.username) ?? [] }));
  },

  async updateRoleAndCenter(
    username: string,
    role: UserRole,
    centerName: string | null,
    requestingUsername: string,
    managedServices: string[] | null = null,
  ) {
    if (role === UserRole.CENTER_MANAGER && !centerName) {
      throw new Error('centerName is required for CENTER_MANAGER role');
    }
    if (role !== UserRole.CENTER_MANAGER && centerName) {
      throw new Error('centerName must be null for non-CM roles');
    }

    // Prevent self-demotion and last-admin removal
    if (role !== UserRole.ADMIN) {
      const current = await prisma.user.findUnique({ where: { username } });
      if (current?.role === UserRole.ADMIN) {
        if (username === requestingUsername) {
          throw new Error('Cannot demote yourself from ADMIN');
        }
        const adminCount = await prisma.user.count({ where: { role: UserRole.ADMIN } });
        if (adminCount <= 1) {
          throw new Error('Cannot remove the last ADMIN user');
        }
      }
    }

    const needsServiceUpdate = role === UserRole.MODERATOR
      ? managedServices !== null
      : true;

    return prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { username },
        data: { role, centerName: role === UserRole.CENTER_MANAGER ? centerName : null },
      });

      if (needsServiceUpdate) {
        await tx.$executeRaw`UPDATE "Service" SET moderators = array_remove(moderators, ${username})`;

        if (role === UserRole.MODERATOR && managedServices && managedServices.length > 0) {
          for (const serviceName of managedServices) {
            await tx.service.update({
              where: { name: serviceName },
              data: { moderators: { push: username } },
            });
          }
        }
      }

      return updatedUser;
    });
  },
};
