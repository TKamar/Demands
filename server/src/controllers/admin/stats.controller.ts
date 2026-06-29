import { Request, Response } from 'express';
import prisma from '../../lib/prisma';

export const statsController = {
  getDashboardStats: async (req: Request, res: Response) => {
    const user = req.auth!.user;
    const { role, username, managedCenters } = user;

    if (role === 'REGULAR_USER') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    try {
      // Build the Prisma where clause based on role
      let demandWhere: object | undefined;

      if (role === 'ADMIN') {
        const rawCenters = req.query.centers;
        const centers: string[] = Array.isArray(rawCenters)
          ? (rawCenters as string[]).filter(Boolean)
          : typeof rawCenters === 'string' && rawCenters ? [rawCenters] : [];

        const rawServices = req.query.services;
        const services: string[] = Array.isArray(rawServices)
          ? (rawServices as string[]).filter(Boolean)
          : typeof rawServices === 'string' && rawServices ? [rawServices] : [];

        const conditions: object[] = [];
        if (centers.length > 0) conditions.push({ centerName: { in: centers } });
        if (services.length > 0) conditions.push({ serviceName: { in: services } });
        demandWhere = conditions.length > 0 ? { AND: conditions } : undefined;

      } else if (role === 'CENTER_MANAGER') {
        demandWhere = managedCenters.length > 0
          ? { centerName: { in: managedCenters } }
          : { centerName: '__no_center__' };

      } else if (role === 'MODERATOR') {
        const modServices = await prisma.service.findMany({
          where: { moderators: { has: username } },
          select: { name: true },
        });
        const serviceNames = modServices.map((s) => s.name);
        demandWhere = serviceNames.length > 0
          ? { serviceName: { in: serviceNames } }
          : { serviceName: '__no_service__' };
      }

      const [byStatus, byCenter, byService, totalProjects] = await Promise.all([
        prisma.demand.groupBy({ by: ['status'], _count: { id: true }, where: demandWhere }),
        prisma.demand.groupBy({ by: ['centerName'], _count: { id: true }, orderBy: { _count: { id: 'desc' } }, where: demandWhere }),
        prisma.demand.groupBy({ by: ['serviceName'], _count: { id: true }, orderBy: { _count: { id: 'desc' } }, where: demandWhere }),
        prisma.project.count({
          where: demandWhere ? { demands: { some: demandWhere as object } } : undefined,
        }),
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
