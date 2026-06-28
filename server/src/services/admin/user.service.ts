import prisma from '../../lib/prisma';
import { UserRole } from '@prisma/client';

export const userService = {
  async getAll() {
    const [users, services, centerAssignments] = await Promise.all([
      prisma.user.findMany({
        include: { center: { select: { name: true } } },
        orderBy: { username: 'asc' },
      }),
      prisma.service.findMany({
        where: { moderators: { isEmpty: false } },
        select: { name: true, moderators: true },
      }),
      prisma.userCenterManagement.findMany({
        select: { username: true, centerName: true },
      }),
    ]);

    const moderatorMap = new Map<string, string[]>();
    for (const svc of services) {
      for (const mod of svc.moderators) {
        if (!moderatorMap.has(mod)) moderatorMap.set(mod, []);
        moderatorMap.get(mod)!.push(svc.name);
      }
    }

    const centerMap = new Map<string, string[]>();
    for (const ca of centerAssignments) {
      if (!centerMap.has(ca.username)) centerMap.set(ca.username, []);
      centerMap.get(ca.username)!.push(ca.centerName);
    }

    return users.map((u) => ({
      ...u,
      managedServices: moderatorMap.get(u.username) ?? [],
      managedCenters: centerMap.get(u.username) ?? [],
    }));
  },

  async updateRoleAndCenter(
    username: string,
    role: UserRole,
    centerNames: string[],
    requestingUsername: string,
    managedServices: string[] | null = null,
  ) {
    if (role === UserRole.CENTER_MANAGER && centerNames.length === 0) {
      throw new Error('At least one centerName is required for CENTER_MANAGER role');
    }
    if (role !== UserRole.CENTER_MANAGER && centerNames.length > 0) {
      throw new Error('centerNames must be empty for non-CM roles');
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
      // Update user role; always set centerName scalar to null (deprecated path)
      const updatedUser = await tx.user.update({
        where: { username },
        data: { role, centerName: null },
      });

      // Sync UserCenterManagement join table
      await tx.userCenterManagement.deleteMany({ where: { username } });
      if (role === UserRole.CENTER_MANAGER && centerNames.length > 0) {
        await tx.userCenterManagement.createMany({
          data: centerNames.map((centerName) => ({ username, centerName })),
        });
      }

      // Sync managed services
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
