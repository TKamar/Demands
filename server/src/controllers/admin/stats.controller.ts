import { Request, Response } from 'express';
import prisma from '../../lib/prisma';

export const statsController = {
  getDashboardStats: async (req: Request, res: Response) => {
    const user = req.auth!.user;
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: Admin role required' });
    }

    try {
      const rawCenters = req.query.centers;
      const centers: string[] = Array.isArray(rawCenters)
        ? (rawCenters as string[]).filter(Boolean)
        : typeof rawCenters === 'string' && rawCenters
        ? [rawCenters]
        : [];

      const where = centers.length > 0 ? { centerName: { in: centers } } : undefined;

      const [byStatus, byCenter, byService, totalProjects] = await Promise.all([
        prisma.demand.groupBy({ by: ['status'], _count: { id: true }, where }),
        prisma.demand.groupBy({ by: ['centerName'], _count: { id: true }, orderBy: { _count: { id: 'desc' } }, where }),
        prisma.demand.groupBy({ by: ['serviceName'], _count: { id: true }, orderBy: { _count: { id: 'desc' } }, where }),
        prisma.project.count({ where }),
      ]);

      const totalDemands = byStatus.reduce((sum, r) => sum + r._count.id, 0);
      const pendingCount = byStatus
        .filter(r => r.status === 'Pending' || r.status === 'PendingCenterManager')
        .reduce((sum, r) => sum + r._count.id, 0);
      const approvedCount = byStatus
        .filter(r => ['Approved', 'ApprovedWithCondition', 'PartiallyApproved'].includes(r.status))
        .reduce((sum, r) => sum + r._count.id, 0);

      const openConditionalStatuses = ['AwaitingProcurement', 'HeldForEfficiency', 'ConditionalFootprintReduction', 'InProgress', 'TransferredTo810', 'WaitingOnPrerequisite'];
      const openConditional: Record<string, number> = {};
      byStatus.forEach(r => {
        if (openConditionalStatuses.includes(r.status)) {
          openConditional[r.status] = r._count.id;
        }
      });

      res.json({
        totalDemands,
        totalProjects,
        pendingCount,
        approvedCount,
        byStatus: Object.fromEntries(byStatus.map(r => [r.status, r._count.id])),
        byCenter: byCenter.map(r => ({ center: r.centerName, count: r._count.id })),
        byService: byService.map(r => ({ service: r.serviceName, count: r._count.id })),
        openConditional,
      });
    } catch (error) {
      console.error('statsController.getDashboardStats error:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
  },
};
