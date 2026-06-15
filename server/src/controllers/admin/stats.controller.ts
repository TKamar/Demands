import { Request, Response } from 'express';
import prisma from '../../lib/prisma';

export const statsController = {
  getDashboardStats: async (req: Request, res: Response) => {
    const user = req.auth!.user;
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: Admin role required' });
    }

    try {
      const [byStatus, byCenter, byService, totalProjects] = await Promise.all([
        prisma.demand.groupBy({ by: ['status'], _count: { id: true } }),
        prisma.demand.groupBy({ by: ['centerName'], _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
        prisma.demand.groupBy({ by: ['serviceName'], _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
        prisma.project.count(),
      ]);

      const totalDemands = byStatus.reduce((sum: number, r: any) => sum + r._count.id, 0);
      const pendingCount = byStatus
        .filter((r: any) => r.status === 'Pending' || r.status === 'PendingCenterManager')
        .reduce((sum: number, r: any) => sum + r._count.id, 0);
      const approvedCount = byStatus
        .filter((r: any) => r.status === 'Approved' || r.status === 'ApprovedWithCondition' || r.status === 'PartiallyApproved')
        .reduce((sum: number, r: any) => sum + r._count.id, 0);

      res.json({
        totalDemands,
        totalProjects,
        pendingCount,
        approvedCount,
        byStatus: Object.fromEntries(byStatus.map((r: any) => [r.status, r._count.id])),
        byCenter: byCenter.map((r: any) => ({ center: r.centerName, count: r._count.id })),
        byService: byService.map((r: any) => ({ service: r.serviceName, count: r._count.id })),
      });
    } catch (error) {
      console.error('statsController.getDashboardStats error:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
  },
};
