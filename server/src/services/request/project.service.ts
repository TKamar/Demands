import prisma from "../../lib/prisma";
import { ProjectType, Median, Prisma, Priority } from "@prisma/client";
import { NotFoundError } from "../../lib/errors";
import { notificationService } from "../notification/notification.service";

export const projectService = {
  findAll: async (
    createdBy?: string,
    pagination?: { page: number; limit: number },
    centerName?: string
  ) => {
    const { page = 1, limit = 10 } = pagination || {};
    const skip = (page - 1) * limit;

    const where: any = centerName ? { centerName } : createdBy ? { createdBy } : undefined;

    const [data, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          location: true,
          kind: true,
          emergencyOption: true,
          _count: {
            select: { demands: true },
          },
        },
        skip,
        take: limit,
      }),
      prisma.project.count({
        where,
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  findByFilters: async (
    filters: { name?: string; createdBy?: string; centerName?: string },
    pagination?: { page: number; limit: number }
  ) => {
    const { page = 1, limit = 10 } = pagination || {};
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.name) {
      where.name = { contains: filters.name, mode: "insensitive" };
    }
    if (filters.centerName) {
      where.centerName = filters.centerName;
    } else if (filters.createdBy) {
      where.createdBy = filters.createdBy;
    }

    const [data, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          location: true,
          kind: true,
          emergencyOption: true,
          _count: {
            select: { demands: true },
          },
        },
        skip,
        take: limit,
      }),
      prisma.project.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  findByName: async (name: string) => {
    return prisma.project.findUnique({
      where: { name },
      include: {
        location: true,
        kind: true,
        emergencyOption: true,
        demands: true,
        _count: {
          select: { demands: true },
        },
      },
    });
  },

  create: async (data: {
    name: string;
    purpose: string;
    relatedTo?: string;
    type: ProjectType;
    kindName: string;
    locationId: number;
    year?: number;
    median?: Median;
    emergencyOptionName?: string;
    centerName: string;
    branchName: string;
    sectionName: string;
    createdBy?: string;
    createdByName?: string;
  }) => {
    const project = await prisma.project.create({
      data,
      include: { location: true, kind: true, emergencyOption: true },
    });

    setImmediate(async () => {
      try {
        await notificationService.createAdminBroadcast({
          type: "NewProject",
          title: "New Project Created",
          message: `Project "${project.name}" was created by ${project.createdByName ?? project.createdBy ?? "unknown"}.`,
          projectName: project.name,
        });
      } catch (err) {
        console.error("[notifications] project create:", err);
      }
    });

    return project;
  },

  update: async (
    name: string,
    data: {
      purpose?: string;
      relatedTo?: string | null;
      type?: ProjectType;
      kindName?: string;
      locationId?: number;
      year?: number | null;
      median?: Median | null;
      emergencyOptionName?: string | null;
      centerName?: string;
      branchName?: string;
      sectionName?: string;
    },
    createdBy?: string
  ) => {
    if (createdBy) {
      const existing = await prisma.project.findFirst({
        where: { name, createdBy },
      });
      if (!existing) {
        throw new NotFoundError("Project");
      }
    }
    const project = await prisma.project.update({
      where: { name },
      data,
      include: { location: true, kind: true, emergencyOption: true },
    });

    setImmediate(async () => {
      try {
        await notificationService.createAdminBroadcast({
          type: "ProjectEdited",
          title: "Project Edited",
          message: `Project "${project.name}" was edited by ${project.createdByName ?? project.createdBy ?? "unknown"}.`,
          projectName: project.name,
        });
      } catch (err) {
        console.error("[notifications] project update:", err);
      }
    });

    return project;
  },

  delete: async (name: string, createdBy?: string) => {
    const existing = await prisma.project.findFirst({
      where: createdBy ? { name, createdBy } : { name },
    });
    if (!existing) {
      throw new NotFoundError("Project");
    }

    const demandCount = await prisma.demand.count({
      where: { projectName: name },
    });
    if (demandCount > 0) {
      throw new Error("Cannot delete project with existing demands");
    }

    const result = await prisma.project.delete({
      where: { name },
    });

    const projectName = existing.name;
    const projectCreatedBy = existing.createdByName ?? existing.createdBy ?? "unknown";
    setImmediate(async () => {
      try {
        await notificationService.createAdminBroadcast({
          type: "ProjectDeleted",
          title: "Project Deleted",
          message: `Project "${projectName}" was deleted by ${projectCreatedBy}.`,
          projectName: projectName,
        });
      } catch (err) {
        console.error("[notifications] project delete:", err);
      }
    });

    return result;
  },

  duplicate: async (
    sourceName: string,
    newProjectData: {
      name: string;
      purpose: string;
      relatedTo?: string;
      type: ProjectType;
      kindName: string;
      locationId: number;
      year?: number;
      median?: Median;
      priority?: Priority;
      emergencyOptionName?: string;
      centerName: string;
      branchName: string;
      sectionName: string;
      createdBy?: string;
      createdByName?: string;
    },
    demands: { id: number; value: number }[]
  ) => {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const sourceDemands = demands.length > 0
        ? await tx.demand.findMany({ where: { id: { in: demands.map((d) => d.id) } } })
        : [];

      const project = await tx.project.create({
        data: newProjectData,
        include: { location: true, kind: true, emergencyOption: true },
      });

      if (sourceDemands.length > 0) {
        const valueMap = new Map(demands.map((d) => [d.id, d.value]));
        await tx.demand.createMany({
          data: sourceDemands.map((d) => ({
            projectName: project.name,
            serviceName: d.serviceName,
            resourceName: d.resourceName,
            resourceService: d.resourceService,
            value: (() => {
              const v = valueMap.get(d.id);
              if (v === undefined) throw new Error(`No value provided for demand ${d.id}`);
              return v;
            })(),
            locationId: d.locationId,
            type: d.type,
            clusterName: d.clusterName ?? undefined,
            centerName: d.centerName,
            branchName: d.branchName,
            sectionName: d.sectionName,
            status: 'Pending' as const,
            createdBy: newProjectData.createdBy,
            createdByName: newProjectData.createdByName,
          })),
        });
      }

      return project;
    });
  },
};
