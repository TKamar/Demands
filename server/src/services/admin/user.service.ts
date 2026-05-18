import prisma from '../../lib/prisma';
import { UserRole } from '@prisma/client';

export const userService = {
  async getAll() {
    return prisma.user.findMany({
      include: { center: { select: { name: true } } },
      orderBy: { username: 'asc' },
    });
  },

  async updateRoleAndCenter(username: string, role: UserRole, centerName: string | null) {
    if (role === UserRole.CENTER_MANAGER && !centerName) {
      throw new Error('centerName is required for CENTER_MANAGER role');
    }
    if (role !== UserRole.CENTER_MANAGER && centerName) {
      throw new Error('centerName must be null for non-CM roles');
    }
    return prisma.user.update({
      where: { username },
      data: { role, centerName: role === UserRole.CENTER_MANAGER ? centerName : null },
    });
  },
};
