import prisma from "../../lib/prisma";
import { DemandType, DemandStatus, ProjectType, Median } from "@prisma/client";
import { NotFoundError } from "../../lib/errors";
import { notificationService } from "../notification/notification.service";
import { syncProjectStatus } from "./projectStatus.service";
import { demandHistoryService } from "./demandHistory.service";

export const demandService = {


  findById: async (id: number) => {
    return prisma.demand.findUnique({
      where: { id },
      include: {
        project: true,
        service: true,
        resource: true,
        location: true,
      },
    });
  },

  findByFilters: async (
    filters: {
      projectName?: string;
      resourceName?: string;
      resourceService?: string;
      locationId?: number;
      baseName?: string;
      environmentName?: string;
      networkName?: string;
      clusterName?: string;
      type?: DemandType;
      status?: DemandStatus;
      createdBy?: string;
      serviceNames?: string[];
      projectType?: ProjectType;
      projectMedian?: Median;
      projectYear?: number;
      projectRelatedTo?: string;
      projectEmergencyOption?: string;
      projectPriority?: string;
      centerName?: string;
      createdFromDate?: Date;
      createdToDate?: Date;
    },
    pagination?: { page: number; limit: number; sortBy?: string; sortDir?: 'asc' | 'desc' }
  ) => {
    const { page = 1, limit = 10, sortBy, sortDir = 'desc' } = pagination || {};
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.projectName) where.projectName = filters.projectName;
    if (filters.resourceName) where.resourceName = filters.resourceName;
    if (filters.resourceService) where.resourceService = filters.resourceService;
    if (filters.locationId) where.locationId = filters.locationId;
    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.createdBy) where.createdBy = filters.createdBy;
    if (filters.serviceNames) where.serviceName = { in: filters.serviceNames };
    if (filters.centerName) where.centerName = filters.centerName;

    if (filters.baseName || filters.environmentName || filters.networkName || filters.clusterName) {
      where.location = {};
      if (filters.baseName) where.location.baseName = filters.baseName;
      if (filters.environmentName) where.location.environmentName = filters.environmentName;
      if (filters.networkName) where.location.networkName = filters.networkName;
      if (filters.clusterName) where.location.clusterName = filters.clusterName;
    }

    if (filters.projectType || filters.projectMedian || filters.projectYear || filters.projectRelatedTo || filters.projectEmergencyOption || filters.projectPriority) {
      where.project = {};
      if (filters.projectType) where.project.type = filters.projectType;
      if (filters.projectMedian) where.project.median = filters.projectMedian;
      if (filters.projectYear) where.project.year = filters.projectYear;
      if (filters.projectRelatedTo) {
        where.project.relatedTo = { contains: filters.projectRelatedTo, mode: 'insensitive' };
      }
      if (filters.projectEmergencyOption) where.project.emergencyOptionName = filters.projectEmergencyOption;
      if (filters.projectPriority) where.project.priority = filters.projectPriority;
    }

    if (filters.createdFromDate || filters.createdToDate) {
      where.createdAt = {};
      if (filters.createdFromDate) where.createdAt.gte = filters.createdFromDate;
      if (filters.createdToDate) where.createdAt.lte = filters.createdToDate;
    }

    let orderBy: any = undefined;
    if (sortBy) {
      switch (sortBy) {
        case 'project':
          orderBy = { projectName: sortDir };
          break;
        case 'status':
          orderBy = { status: sortDir };
          break;
        case 'value':
          orderBy = { value: sortDir };
          break;
        case 'service':
          orderBy = { serviceName: sortDir };
          break;
        case 'resource':
          orderBy = { resourceName: sortDir };
          break;
        case 'createdAt':
          orderBy = { createdAt: sortDir };
          break;
        default:
          orderBy = { [sortBy]: sortDir };
      }
    } else {
      orderBy = { createdAt: 'desc' };
    }

    const [data, total, totalPending, aggregates] = await Promise.all([
      prisma.demand.findMany({
        where,
        include: {
          project: true,
          service: true,
          resource: true,
          location: true,
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.demand.count({ where }),
      prisma.demand.count({ where: { ...where, status: "Pending" } }),
      prisma.demand.aggregate({ where, _sum: { value: true, approvedValue: true } }),
    ]);

    return {
      data,
      meta: {
        total,
        totalPending,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        totalValue: aggregates._sum.value ?? 0,
        totalApprovedValue: aggregates._sum.approvedValue ?? 0,
      },
    };
  },

  create: async (data: {
    projectName: string;
    serviceName: string;
    resourceName: string;
    resourceService: string;
    value: number;
    locationId: number;
    type: DemandType;
    clusterName?: string;
    centerName: string;
    branchName: string;
    sectionName: string;
    createdBy?: string;
    createdByName?: string;
  }) => {
    const demand = await prisma.demand.create({
      data: {
        ...data,
        status: "PendingCenterManager",
      },
      include: {
        project: true,
        service: true,
        resource: true,
        location: true,
      },
    });

    const moderators = (demand.service?.moderators ?? []) as string[];
    const notifData = {
      type: "NewDemand" as const,
      title: "New Demand Submitted",
      message: `New demand for ${demand.resourceName} (${demand.value} ${demand.resource?.unit ?? ""}) in project "${demand.projectName}" was submitted by ${demand.createdByName ?? demand.createdBy ?? "unknown"}.`,
      demandId: demand.id,
      projectName: demand.projectName,
    };
    setImmediate(async () => {
      try {
        await Promise.all([
          ...moderators.map((u) => notificationService.createForUser(u, notifData)),
          notificationService.createAdminBroadcast(notifData),
        ]);
      } catch (err) {
        console.error("[notifications] create:", err);
      }
    });

    setImmediate(() => {
      demandHistoryService.log(demand.id, 'Created', data.createdBy, { value: demand.value }).catch(() => {});
    });

    return demand;
  },

  update: async (
    id: number,
    data: {
      serviceName?: string;
      resourceName?: string;
      resourceService?: string;
      value?: number;
      locationId?: number;
      type?: DemandType;
      clusterName?: string;
      centerName?: string;
      branchName?: string;
      sectionName?: string;
    },
    createdBy?: string
  ) => {
    const existing = await prisma.demand.findFirst({
      where: createdBy ? { id, createdBy } : { id },
    });
    if (!existing) {
      throw new NotFoundError("Demand");
    }
    if (existing.status !== "Pending") {
      throw new Error("Only pending demands can be edited");
    }
    const demand = await prisma.demand.update({
      where: { id },
      data,
      include: {
        project: true,
        service: true,
        resource: true,
        location: true,
      },
    });

    const moderators = (demand.service?.moderators ?? []) as string[];
    const notifData = {
      type: "DemandEdited" as const,
      title: "Demand Edited",
      // Uses original creator for attribution — service doesn't receive acting user separately
      message: `The demand for ${demand.resourceName} in project "${demand.projectName}" was edited by ${demand.createdByName ?? demand.createdBy ?? "unknown"}.`,
      demandId: demand.id,
      projectName: demand.projectName,
    };
    setImmediate(async () => {
      try {
        await Promise.all([
          ...moderators.map((u) => notificationService.createForUser(u, notifData)),
          notificationService.createAdminBroadcast(notifData),
        ]);
      } catch (err) {
        console.error("[notifications] update:", err);
      }
    });

    return demand;
  },

  delete: async (id: number, createdBy?: string) => {
    if (createdBy) {
      const existing = await prisma.demand.findFirst({
        where: { id, createdBy },
      });
      if (!existing) {
        throw new NotFoundError("Demand");
      }
    }
    return prisma.demand.delete({
      where: { id },
    });
  },

  reject: async (id: number, reason: string, actorUsername?: string) => {
    const demand = await prisma.$transaction(async (tx) => {
      const updated = await tx.demand.update({
        where: { id },
        data: {
          status: "Rejected",
          reason,
        },
        include: {
          project: true,
          service: true,
          resource: true,
          location: true,
        },
      });

      if (updated.isInternalTicket) {
        await tx.demand.updateMany({
          where: { prerequisiteDemandId: updated.id, status: 'WaitingOnPrerequisite' },
          data: { status: 'Pending', prerequisiteDemandId: null },
        });
      }

      return updated;
    });

    if (demand.createdBy) {
      setImmediate(async () => {
        try {
          await notificationService.createForUser(demand.createdBy!, {
            type: "DemandDecision",
            title: "Decision Received on Your Demand",
            message: `Your demand for ${demand.resourceName} in project "${demand.projectName}" was rejected.${demand.reason ? ` Reason: ${demand.reason}` : ""}`,
            demandId: demand.id,
            projectName: demand.projectName,
          });
        } catch (err) {
          console.error("[notifications] reject:", err);
        }
      });
    }

    setImmediate(() => {
      syncProjectStatus(demand.projectName, actorUsername ?? '').catch(() => {});
      demandHistoryService.log(demand.id, 'Rejected', actorUsername, { reason }).catch(() => {});
    });

    return demand;
  },

  cancel: async (id: number, createdBy?: string) => {
    const existing = await prisma.demand.findFirst({
      where: createdBy ? { id, createdBy } : { id },
    });
    if (!existing) {
      throw new NotFoundError("Demand");
    }
    if (existing.status !== "Pending") {
      throw new Error("Only pending demands can be cancelled");
    }
    const demand = await prisma.demand.update({
      where: { id },
      data: {
        status: "Cancelled",
      },
      include: {
        project: true,
        service: true,
        resource: true,
        location: true,
      },
    });

    const moderators = (demand.service?.moderators ?? []) as string[];
    const notifData = {
      type: "DemandCancelled" as const,
      title: "Demand Cancelled by Creator",
      message: `The demand for ${demand.resourceName} in project "${demand.projectName}" was cancelled by ${demand.createdByName ?? demand.createdBy ?? "unknown"}.`,
      demandId: demand.id,
      projectName: demand.projectName,
    };
    setImmediate(async () => {
      try {
        await Promise.all([
          ...moderators.map((u) => notificationService.createForUser(u, notifData)),
          notificationService.createAdminBroadcast(notifData),
        ]);
      } catch (err) {
        console.error("[notifications] cancel:", err);
      }
    });

    return demand;
  },

  restore: async (id: number, createdBy?: string) => {
    const existing = await prisma.demand.findFirst({
      where: createdBy ? { id, createdBy } : { id },
    });
    if (!existing) {
      throw new NotFoundError("Demand");
    }
    if (existing.status !== "Rejected" && existing.status !== "CenterManagerRejected") {
      throw new Error("Only rejected demands can be restored");
    }
    const demand = await prisma.demand.update({
      where: { id },
      data: {
        status: "PendingCenterManager",
      },
      include: {
        project: true,
        service: true,
        resource: true,
        location: true,
      },
    });
    return demand;
  },

  approve: async (
    id: number,
    data: {
      status: string;
      approvedValue?: number;
      reason?: string;
      procurementDate?: Date;
      assignedToUser?: string;
      actorUsername?: string;
    }
  ) => {
    const openStatuses = ['AwaitingProcurement', 'HeldForEfficiency', 'ConditionalFootprintReduction', 'InProgress', 'TransferredTo810'];
    const demand = await prisma.$transaction(async (tx) => {
      const updated = await tx.demand.update({
        where: { id },
        data: {
          status: data.status as any,
          approvedValue: data.approvedValue,
          approvedDate: openStatuses.includes(data.status) ? undefined : new Date(),
          reason: data.reason,
          procurementDate: data.procurementDate as any,
          assignedToUser: data.assignedToUser,
        } as any,
        include: {
          project: true,
          service: true,
          location: true,
        },
      });

      if (updated.isInternalTicket) {
        await tx.demand.updateMany({
          where: { prerequisiteDemandId: updated.id, status: 'WaitingOnPrerequisite' },
          data: { status: 'Pending', prerequisiteDemandId: null },
        });
      }

      return updated;
    });

    if (demand.createdBy) {
      const statusLabel: Record<string, string> = {
        Approved: "approved",
        PartiallyApproved: "partially approved",
        ApprovedWithCondition: "approved with condition",
        AwaitingProcurement: "awaiting procurement",
        HeldForEfficiency: "held for efficiency",
        ConditionalFootprintReduction: "approved with footprint condition",
        InProgress: "in progress",
        TransferredTo810: "transferred to 810",
      };
      const label = statusLabel[demand.status] ?? demand.status;
      setImmediate(async () => {
        try {
          await notificationService.createForUser(demand.createdBy!, {
            type: "DemandDecision",
            title: "Decision Received on Your Demand",
            message: `Your demand for ${demand.resourceName} in project "${demand.projectName}" was ${label}.${demand.approvedValue != null ? ` Approved value: ${demand.approvedValue}.` : ""}`,
            demandId: demand.id,
            projectName: demand.projectName,
          });
        } catch (err) {
          console.error("[notifications] approve:", err);
        }
      });
    }

    setImmediate(() => {
      syncProjectStatus(demand.projectName, data.actorUsername ?? '').catch(() => {});
      demandHistoryService.log(demand.id, demand.status, data.actorUsername, { approvedValue: demand.approvedValue, reason: demand.reason }).catch(() => {});
    });

    return demand;
  },

  bulkApprove: async (
    where: any,
    data: {
      status: "Approved" | "PartiallyApproved" | "ApprovedWithCondition";
      approvedValue?: number;
      reason?: string;
      actorUsername?: string;
    }
  ) => {
    const affectedDemands = await prisma.demand.findMany({
      where: { ...where, status: "Pending" },
      select: { id: true, projectName: true },
      distinct: ['projectName'],
    });

    const result = await prisma.demand.updateMany({
      where: { ...where, status: "Pending" },
      data: {
        status: data.status,
        approvedDate: new Date(),
        ...(data.approvedValue !== undefined && { approvedValue: data.approvedValue }),
        ...(data.reason !== undefined && { reason: data.reason }),
      },
    });

    setImmediate(() => {
      const projectNames = affectedDemands.map(d => d.projectName);
      Promise.all(projectNames.map(p => syncProjectStatus(p, data.actorUsername ?? ''))).catch(() => {});
      affectedDemands.forEach(d => {
        demandHistoryService.log(d.id, data.status, data.actorUsername, { reason: data.reason }).catch(() => {});
      });
    });

    return result;
  },

  bulkReject: async (where: any, reason: string, actorUsername?: string) => {
    const affectedDemands = await prisma.demand.findMany({
      where: { ...where, status: "Pending" },
      select: { id: true, projectName: true },
      distinct: ['projectName'],
    });

    const result = await prisma.demand.updateMany({
      where: { ...where, status: "Pending" },
      data: {
        status: "Rejected",
        reason,
      },
    });

    setImmediate(() => {
      const projectNames = affectedDemands.map(d => d.projectName);
      Promise.all(projectNames.map(p => syncProjectStatus(p, actorUsername ?? ''))).catch(() => {});
      affectedDemands.forEach(d => {
        demandHistoryService.log(d.id, 'Rejected', actorUsername, { reason }).catch(() => {});
      });
    });

    return result;
  },

  getDemandsByCenterAndStatus: async (centerName: string, status: DemandStatus) => {
    return prisma.demand.findMany({
      where: { centerName, status },
      include: { project: true, location: true, service: true, resource: true },
      orderBy: { createdAt: 'asc' },
    });
  },

  getHistoryDemands: async (
    filters: {
      username: string;
      isAdmin: boolean;
      isModerator: boolean;
      isCenterManager: boolean;
      centerName?: string;
    },
    pagination?: { page: number; limit: number }
  ) => {
    const { username, isAdmin, isModerator, isCenterManager, centerName } = filters;
    const { page = 1, limit = 20 } = pagination || {};
    const skip = (page - 1) * limit;

    const terminalStatuses = [
      'Approved', 'PartiallyApproved', 'ApprovedWithCondition',
      'Rejected', 'CenterManagerRejected', 'Cancelled',
    ];

    const where: any = { status: { in: terminalStatuses }, isInternalTicket: false };

    if (isAdmin) {
      // Global audit log — see all; respect explicit center filter
      if (centerName) where.centerName = centerName;
    } else if (isModerator) {
      // See all demands in managed services (across any center)
      const managedServices = await prisma.service.findMany({
        where: { moderators: { has: username } },
        select: { name: true },
      });
      where.serviceName = { in: managedServices.map(s => s.name) };
      if (centerName) where.centerName = centerName;
    } else if (isCenterManager) {
      // See all demands in their center
      if (centerName) where.centerName = centerName;
    } else {
      // Regular user sees only own demands
      where.createdBy = username;
    }

    const [data, total] = await Promise.all([
      prisma.demand.findMany({
        where,
        include: { project: true, service: true, resource: true, location: true },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.demand.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  },

  createDemandGroup: async (groupData: {
    projectName: string;
    serviceName: string;
    type: DemandType;
    clusterName?: string;
    centerName: string;
    branchName: string;
    sectionName: string;
    createdBy: string;
    createdByName: string;
    rows: Array<{ resourceName: string; resourceService: string; value: number; locationId: number }>;
  }) => {
    const { rows, ...shared } = groupData;
    // Get next requirementGroupId in same transaction
    const result = await prisma.$transaction(async (tx) => {
      const agg = await tx.demand.aggregate({ _max: { requirementGroupId: true } });
      const nextGroupId = (agg._max.requirementGroupId ?? 0) + 1;
      const created = await Promise.all(
        rows.map((row) =>
          tx.demand.create({
            data: {
              ...shared,
              ...row,
              status: 'PendingCenterManager',
              requirementGroupId: nextGroupId,
            },
            include: { project: true, service: true, resource: true, location: true },
          })
        )
      );
      return created;
    });
    return result;
  },

  centerManagerApprove: async (id: number, centerName: string) => {
    const demand = await prisma.demand.findUnique({ where: { id } });
    if (!demand) throw new NotFoundError('Demand');
    if (demand.status !== 'PendingCenterManager') throw new Error('Demand is not pending center manager approval');
    if (demand.centerName !== centerName) throw new Error('Forbidden');
    return prisma.demand.update({
      where: { id },
      data: { status: 'Pending' },
      include: { project: true, service: true, resource: true, location: true },
    });
  },

  centerManagerReject: async (id: number, reason: string, centerName: string) => {
    const demand = await prisma.demand.findUnique({ where: { id } });
    if (!demand) throw new NotFoundError('Demand');
    if (demand.status !== 'PendingCenterManager') throw new Error('Demand is not pending center manager approval');
    if (demand.centerName !== centerName) throw new Error('Forbidden');
    return prisma.demand.update({
      where: { id },
      data: { status: 'CenterManagerRejected', reason },
      include: { project: true, service: true, resource: true, location: true },
    });
  },

  transferDemand: async (id: number, targetServiceName: string, requesterId: string) => {
    const original = await prisma.demand.findUnique({
      where: { id },
      include: { service: true, resource: true, location: true, project: true },
    });
    if (!original) throw new NotFoundError('Demand');
    if (original.status !== 'Pending') throw new Error('Only Pending demands can be transferred');

    const targetService = await prisma.service.findUnique({ where: { name: targetServiceName } });
    if (!targetService) throw new Error('Target service not found');
    if (!targetService.isActive) throw new Error('Target service is not active');

    const targetResource = await prisma.resource.findUnique({
      where: { name_serviceName: { name: original.resourceName, serviceName: targetServiceName } },
    });
    if (!targetResource || !targetResource.isActive) {
      throw new Error(
        `Service "${targetServiceName}" does not support resource "${original.resourceName}"`
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const internal = await tx.demand.create({
        data: {
          projectName: original.projectName,
          serviceName: targetServiceName,
          resourceName: original.resourceName,
          resourceService: targetServiceName,
          value: original.value,
          locationId: original.locationId,
          type: original.type,
          clusterName: original.clusterName ?? undefined,
          centerName: original.centerName,
          branchName: original.branchName,
          sectionName: original.sectionName,
          createdBy: requesterId,
          createdByName: original.createdByName ?? original.createdBy ?? 'System',
          status: 'Pending',
          isInternalTicket: true,
        },
        include: { project: true, service: true, resource: true, location: true },
      });

      const updated = await tx.demand.update({
        where: { id },
        data: { status: 'WaitingOnPrerequisite', prerequisiteDemandId: internal.id },
        include: { project: true, service: true, resource: true, location: true },
      });

      return { original: updated, internal };
    });

    return result;
  },

  approveMatrix: async (decisions: Array<{ id: number; approvedValue: number; status: 'Approved' | 'PartiallyApproved'; reason?: string }>, actorUsername?: string) => {
    const updates = decisions.map((decision) =>
      prisma.demand.updateMany({
        where: { id: decision.id, status: 'Pending' },
        data: {
          status: decision.status,
          approvedValue: decision.approvedValue,
          approvedDate: new Date(),
          ...(decision.reason ? { reason: decision.reason } : {}),
        },
      })
    );

    const results = await Promise.all(updates);
    const count = results.reduce((acc, result) => acc + result.count, 0);

    setImmediate(() => {
      decisions.forEach(d => {
        demandHistoryService.log(d.id, d.status, actorUsername, { reason: d.reason }).catch(() => {});
      });
    });

    return { count };
  },
};
