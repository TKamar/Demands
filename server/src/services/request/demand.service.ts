import prisma from "../../lib/prisma";
import { DemandType, DemandStatus, ProjectType, Median } from "@prisma/client";
import { NotFoundError } from "../../lib/errors";
import { notificationService } from "../notification/notification.service";

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
        status: "Pending",
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

  reject: async (id: number, reason: string) => {
    const demand = await prisma.demand.update({
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
      status: "Approved" | "PartiallyApproved" | "ApprovedWithCondition";
      approvedValue?: number;
      reason?: string;
    }
  ) => {
    const demand = await prisma.demand.update({
      where: { id },
      data: {
        status: data.status,
        approvedValue: data.approvedValue,
        approvedDate: new Date(),
        reason: data.reason,
      },
      include: {
        project: true,
        service: true,
        resource: true,
        location: true,
      },
    });

    if (demand.createdBy) {
      const statusLabel: Record<string, string> = {
        Approved: "approved",
        PartiallyApproved: "partially approved",
        ApprovedWithCondition: "approved with condition",
      };
      const label = statusLabel[demand.status] ?? demand.status;
      setImmediate(async () => {
        try {
          await notificationService.createForUser(demand.createdBy!, {
            type: "DemandDecision",
            title: "Decision Received on Your Demand",
            message: `Your demand for ${demand.resourceName} in project "${demand.projectName}" was ${label}.${demand.approvedValue != null ? ` Approved value: ${demand.approvedValue} ${demand.resource?.unit ?? ""}.` : ""}`,
            demandId: demand.id,
            projectName: demand.projectName,
          });
        } catch (err) {
          console.error("[notifications] approve:", err);
        }
      });
    }

    return demand;
  },

  bulkApprove: async (
    where: any,
    data: {
      status: "Approved" | "PartiallyApproved" | "ApprovedWithCondition";
      approvedValue?: number;
      reason?: string;
    }
  ) => {
    // Bulk operations skip per-demand notifications intentionally — too noisy for batch decisions.
    return prisma.demand.updateMany({
      where: { ...where, status: "Pending" },
      data: {
        status: data.status,
        approvedDate: new Date(),
        ...(data.approvedValue !== undefined && { approvedValue: data.approvedValue }),
        ...(data.reason !== undefined && { reason: data.reason }),
      },
    });
  },

  bulkReject: async (where: any, reason: string) => {
    // Bulk operations skip per-demand notifications intentionally — too noisy for batch decisions.
    return prisma.demand.updateMany({
      where: { ...where, status: "Pending" },
      data: {
        status: "Rejected",
        reason,
      },
    });
  },

  getDemandsByCenterAndStatus: async (centerName: string, status: DemandStatus) => {
    return prisma.demand.findMany({
      where: { centerName, status },
      include: { project: true, location: true, service: true, resource: true },
      orderBy: { createdAt: 'asc' },
    });
  },
};
