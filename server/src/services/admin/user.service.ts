import prisma from '../../lib/prisma';
import { UserRole } from '@prisma/client';

export const userService = {
  async getAll() {
    return prisma.user.findMany({
      include: { center: { select: { name: true } } },
      orderBy: { username: 'asc' },
    });
  },

  async updateRoleAndCenter(username: string, role: UserRole, centerName: string | null, requestingUsername: string) {
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

    return prisma.user.update({
      where: { username },
      data: { role, centerName: role === UserRole.CENTER_MANAGER ? centerName : null },
    });
  },
};
