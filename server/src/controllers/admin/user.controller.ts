import { Request, Response } from 'express';
import { userService } from '../../services/admin/user.service';
import { UserRole } from '@prisma/client';
import prisma from '../../lib/prisma';

export const userController = {
  async getAll(req: Request, res: Response) {
    try {
      const users = await userService.getAll();
      res.json(users);
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  },

  async updateUser(req: Request, res: Response) {
    const { username } = req.params;
    const { role, centerNames, managedServices } = req.body as {
      role: UserRole;
      centerNames?: string[];
      managedServices?: string[];
    };
    if (!role || !Object.values(UserRole).includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    if (
      role === UserRole.MODERATOR &&
      managedServices !== undefined &&
      (!Array.isArray(managedServices) || managedServices.some((s) => typeof s !== 'string'))
    ) {
      return res.status(400).json({ message: 'managedServices must be an array of strings' });
    }
    if (role === UserRole.CENTER_MANAGER) {
      if (!Array.isArray(centerNames) || centerNames.length === 0) {
        return res.status(400).json({ message: 'centerNames must be a non-empty array for CENTER_MANAGER role' });
      }
      if (centerNames.some((c) => typeof c !== 'string')) {
        return res.status(400).json({ message: 'centerNames must be an array of strings' });
      }
    }
    try {
      await userService.updateRoleAndCenter(
        username,
        role,
        role === UserRole.CENTER_MANAGER ? (centerNames ?? []) : [],
        req.auth!.user.username,
        managedServices ?? null,
      );
      // Re-fetch with managedCenters for the response
      const centerAssignments = await prisma.userCenterManagement.findMany({
        where: { username },
        select: { centerName: true },
      });
      const user = await prisma.user.findUnique({ where: { username } });
      res.json({
        ...user,
        managedCenters: centerAssignments.map((c) => c.centerName),
      });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  },
};
