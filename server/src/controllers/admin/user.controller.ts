import { Request, Response } from 'express';
import { userService } from '../../services/admin/user.service';
import { UserRole } from '@prisma/client';

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
    const { role, centerName } = req.body as { role: UserRole; centerName?: string };
    if (!role || !Object.values(UserRole).includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    try {
      const updated = await userService.updateRoleAndCenter(username, role, centerName ?? null, req.auth!.user.username);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  },
};
