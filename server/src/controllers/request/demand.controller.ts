import { Request, Response } from "express";
import { demandService } from "../../services/request/demand.service";
import { projectService } from "../../services/request/project.service";
import { DemandType, DemandStatus, ProjectType, Median } from "@prisma/client";
import { settings } from "../../lib/settings";
import { NotFoundError } from "../../lib/errors";
import prisma from "../../lib/prisma";

function getUserContext(req: Request) {
  const user = req.auth!.user;
  const isAdmin = user.hasAnyRole([settings.authAdminGroup]);
  const isModerator = user.hasAnyRole([settings.authModeratorGroup]);
  const isPrivileged = isAdmin || isModerator;
  return {
    username: user.username,
    fullName: user.fullName ?? user.username ?? user.email ?? "Unknown",
    isPrivileged,
    isAdmin,
    isModerator,
  };
}

export const demandController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const { username, isAdmin } = getUserContext(req);
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;

      const { sortBy, sortDir } = req.query;

      const result = await demandService.findByFilters(
        {
          createdBy: isAdmin ? undefined : username,
        },
        {
          page,
          limit,
          sortBy: typeof sortBy === 'string' ? sortBy : undefined,
          sortDir: sortDir === 'asc' ? 'asc' : 'desc'
        }
      );
      res.json(result);
    } catch (error) {
      console.error("demandController.getAll error:", error);
      res.status(500).json({ error: "Failed to fetch demands" });
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const { username, isPrivileged } = getUserContext(req);
      const demand = await demandService.findById(Number(req.params.id));
      if (!demand) {
        return res.status(404).json({ error: "Demand not found" });
      }
      if (!isPrivileged && demand.createdBy !== username) {
        return res.status(404).json({ error: "Demand not found" });
      }
      res.json(demand);
    } catch (error) {
      console.error("demandController.getById error:", error);
      res.status(500).json({ error: "Failed to fetch demand" });
    }
  },

  getByFilters: async (req: Request, res: Response) => {
    try {
      const { username, isAdmin, isModerator } = getUserContext(req);
      const {
        project,
        resource,
        resourceService,
        location,
        base,
        environment,
        network,
        cluster,
        type,
        status,
        projectType,
        median,
        year,
        relatedTo,
        emergencyOption,
        managed,
        page: pageQuery,
        limit: limitQuery,
        sortBy,
        sortDir,
      } = req.query;

      const page = Number(pageQuery) || 1;
      const limit = Number(limitQuery) || 10;
      const isManagedView = managed === 'true';

      let createdByFilter: string | undefined;
      let serviceNamesFilter: string[] | undefined;

      if (isManagedView) {
        if (isModerator && !isAdmin) {
          // Moderator on management page: scope to services they manage
          const managedServices = await prisma.service.findMany({
            where: { moderators: { has: username } },
            select: { name: true },
          });
          serviceNamesFilter = managedServices.map((s) => s.name);
        }
        // Admin on management page: no restrictions (all demands visible)
      } else {
        // Demands page: everyone except admins sees only their own demands
        if (!isAdmin) {
          createdByFilter = username;
        }
      }

      const result = await demandService.findByFilters(
        {
          projectName: project as string | undefined,
          resourceName: resource as string | undefined,
          resourceService: resourceService as string | undefined,
          locationId: location ? Number(location) : undefined,
          baseName: base as string | undefined,
          environmentName: environment as string | undefined,
          networkName: network as string | undefined,
          clusterName: cluster as string | undefined,
          type: type as DemandType | undefined,
          status: status as DemandStatus | undefined,
          createdBy: createdByFilter,
          serviceNames: serviceNamesFilter,
          projectType: projectType as ProjectType | undefined,
          projectMedian: median as Median | undefined,
          projectYear: year ? Number(year) : undefined,
          projectRelatedTo: relatedTo as string | undefined,
          projectEmergencyOption: emergencyOption as string | undefined,
          projectPriority: req.query.priority as string | undefined,
        },
        {
          page,
          limit,
          sortBy: typeof sortBy === 'string' ? sortBy : undefined,
          sortDir: sortDir === 'asc' ? 'asc' : 'desc'
        }
      );
      res.json(result);
    } catch (error) {
      console.error("demandController.getByFilters error:", error);
      res.status(500).json({ error: "Failed to fetch demands" });
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const { username, fullName, isPrivileged } = getUserContext(req);
      const {
        projectName,
        serviceName,
        resourceName,
        resourceService,
        value,
        locationId,
        type,
        clusterName,
        centerName,
        branchName,
        sectionName,
      } = req.body;

      // Validate: clusterName is required if type is Extention
      if (type === DemandType.Extension && !clusterName) {
        return res.status(400).json({ error: "clusterName is required for Extention demands" });
      }

      // Verify the user has access to the project
      const project = await projectService.findByName(projectName);
      if (!project) {
        return res.status(400).json({ error: "Project not found" });
      }
      if (!isPrivileged && project.createdBy !== username) {
        return res.status(400).json({ error: "Project not found" });
      }

      // If locationId is not provided, use project's locationId
      const finalLocationId = locationId || project.locationId;

      // Validate: service must be active
      const service = await prisma.service.findUnique({
        where: { name: serviceName },
      });
      if (!service) {
        return res.status(400).json({ error: "Service not found" });
      }
      if (!service.isActive) {
        return res.status(400).json({ error: "Service is not active" });
      }

      // Validate: resource must be active
      const resource = await prisma.resource.findUnique({
        where: { name_serviceName: { name: resourceName, serviceName: resourceService } },
      });
      if (!resource) {
        return res.status(400).json({ error: "Resource not found" });
      }
      if (!resource.isActive) {
        return res.status(400).json({ error: "Resource is not active" });
      }

      // Validate: location and its related entities must be active
      const location = await prisma.location.findUnique({
        where: { id: finalLocationId },
        include: { base: true, environment: true, network: true },
      });
      if (!location) {
        return res.status(400).json({ error: "Location not found" });
      }
      if (!location.isActive) {
        return res.status(400).json({ error: "Location is not active" });
      }
      if (!location.base.isActive) {
        return res.status(400).json({ error: "Base is not active" });
      }
      if (!location.environment.isActive) {
        return res.status(400).json({ error: "Environment is not active" });
      }
      if (!location.network.isActive) {
        return res.status(400).json({ error: "Network is not active" });
      }

      // If organization fields not provided, inherit from project
      const finalCenterName = centerName || project.centerName;
      const finalBranchName = branchName || project.branchName;
      const finalSectionName = sectionName || project.sectionName;

      // Validate: center must be active
      const center = await prisma.center.findUnique({
        where: { name: finalCenterName },
      });
      if (!center) {
        return res.status(400).json({ error: "Center not found" });
      }
      if (!center.isActive) {
        return res.status(400).json({ error: "Center is not active" });
      }

      // Validate: branch must be active
      const branch = await prisma.branch.findUnique({
        where: { name_centerName: { name: finalBranchName, centerName: finalCenterName } },
      });
      if (!branch) {
        return res.status(400).json({ error: "Branch not found" });
      }
      if (!branch.isActive) {
        return res.status(400).json({ error: "Branch is not active" });
      }

      // Validate: section must be active
      const sectionEntity = await prisma.section.findUnique({
        where: { name_branchName_branchCenter: { name: finalSectionName, branchName: finalBranchName, branchCenter: finalCenterName } },
      });
      if (!sectionEntity) {
        return res.status(400).json({ error: "Section not found" });
      }
      if (!sectionEntity.isActive) {
        return res.status(400).json({ error: "Section is not active" });
      }

      const demand = await demandService.create({
        projectName,
        serviceName,
        resourceName,
        resourceService,
        value,
        locationId: finalLocationId,
        type,
        clusterName: type === DemandType.Extension ? clusterName : undefined,
        centerName: finalCenterName,
        branchName: finalBranchName,
        sectionName: finalSectionName,
        createdBy: username,
        createdByName: fullName,
      });
      res.status(201).json(demand);
    } catch (error) {
      console.error("demandController.create error:", error);
      res.status(400).json({ error: "Failed to create demand" });
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const { username, isPrivileged } = getUserContext(req);
      const {
        serviceName,
        resourceName,
        resourceService,
        value,
        locationId,
        type,
        clusterName,
        centerName,
        branchName,
        sectionName,
      } = req.body;

      // If updating type to Extention, clusterName is required
      if (type === DemandType.Extension && !clusterName) {
        const existingDemand = await demandService.findById(Number(req.params.id));
        if (!existingDemand?.clusterName) {
          return res.status(400).json({ error: "clusterName is required for Extention demands" });
        }
      }

      // Fetch current demand to compare values
      const currentDemand = await demandService.findById(Number(req.params.id));
      if (!currentDemand) {
        return res.status(404).json({ error: "Demand not found" });
      }

      // Validate organization fields if provided
      if (centerName) {
        const center = await prisma.center.findUnique({ where: { name: centerName } });
        if (!center) {
          return res.status(400).json({ error: "Center not found" });
        }
        // Only validate active status if the value is changing
        if (!center.isActive && center.name !== currentDemand.centerName) {
          return res.status(400).json({ error: "Center is not active" });
        }
      }

      const targetCenter = centerName || currentDemand.centerName;

      if (branchName) {
        const branch = await prisma.branch.findUnique({
          where: { name_centerName: { name: branchName, centerName: targetCenter } },
        });
        if (!branch) {
          return res.status(400).json({ error: "Branch not found" });
        }
        // Only validate active status if the value is changing
        if (!branch.isActive && branch.name !== currentDemand.branchName) {
          return res.status(400).json({ error: "Branch is not active" });
        }
      }

      const targetBranch = branchName || currentDemand.branchName;

      if (sectionName) {
        const sectionEntity = await prisma.section.findUnique({
          where: { name_branchName_branchCenter: { name: sectionName, branchName: targetBranch, branchCenter: targetCenter } },
        });
        if (!sectionEntity) {
          return res.status(400).json({ error: "Section not found" });
        }
        // Only validate active status if the value is changing
        if (!sectionEntity.isActive && sectionEntity.name !== currentDemand.sectionName) {
          return res.status(400).json({ error: "Section is not active" });
        }
      }

      const demand = await demandService.update(
        Number(req.params.id),
        {
          serviceName,
          resourceName,
          resourceService,
          value,
          locationId,
          type,
          clusterName,
          centerName,
          branchName,
          sectionName,
        },
        isPrivileged ? undefined : username
      );
      res.json(demand);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ error: "Demand not found" });
      }
      if (error instanceof Error && error.message.includes("pending")) {
        return res.status(400).json({ error: error.message });
      }
      console.error("demandController.update error:", error);
      res.status(400).json({ error: "Failed to update demand" });
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const { username, isPrivileged } = getUserContext(req);
      await demandService.delete(
        Number(req.params.id),
        isPrivileged ? undefined : username
      );
      res.status(204).send();
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ error: "Demand not found" });
      }
      console.error("demandController.delete error:", error);
      res.status(400).json({ error: "Failed to delete demand" });
    }
  },

  reject: async (req: Request, res: Response) => {
    try {
      const { reason } = req.body;

      // Validate: reason is required for rejection
      if (!reason || typeof reason !== 'string' || reason.trim() === '') {
        return res.status(400).json({ error: "reason is required for rejection" });
      }

      const demand = await demandService.reject(Number(req.params.id), reason.trim());
      res.json(demand);
    } catch (error) {
      console.error("demandController.reject error:", error);
      res.status(400).json({ error: "Failed to reject demand" });
    }
  },

  cancel: async (req: Request, res: Response) => {
    try {
      const { username, isPrivileged } = getUserContext(req);
      const demand = await demandService.cancel(
        Number(req.params.id),
        isPrivileged ? undefined : username
      );
      res.json(demand);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ error: "Demand not found" });
      }
      if (error instanceof Error && error.message.includes("pending")) {
        return res.status(400).json({ error: error.message });
      }
      console.error("demandController.cancel error:", error);
      res.status(400).json({ error: "Failed to cancel demand" });
    }
  },

  bulkApprove: async (req: Request, res: Response) => {
    try {
      const { username, isAdmin, isModerator } = getUserContext(req);
      const { ids, selectAll, filters, excludedIds, status, approvedValue, reason } = req.body;

      const validStatuses = [DemandStatus.Approved, DemandStatus.PartiallyApproved, DemandStatus.ApprovedWithCondition];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "status must be Approved, PartiallyApproved, or ApprovedWithCondition" });
      }

      const requiresValueAndReason = status === DemandStatus.PartiallyApproved || status === DemandStatus.ApprovedWithCondition;
      if (requiresValueAndReason && (approvedValue === undefined || approvedValue === null)) {
        return res.status(400).json({ error: "approvedValue is required for PartiallyApproved and ApprovedWithCondition status" });
      }
      if (requiresValueAndReason && (!reason || typeof reason !== 'string' || reason.trim() === '')) {
        return res.status(400).json({ error: "reason is required for PartiallyApproved and ApprovedWithCondition status" });
      }

      let where: any = {};

      if (ids && Array.isArray(ids) && ids.length > 0) {
        where.id = { in: ids };
      } else if (selectAll && filters) {
        // Apply moderator scoping
        let serviceNamesFilter: string[] | undefined;
        if (isModerator && !isAdmin) {
          const managedServices = await prisma.service.findMany({
            where: { moderators: { has: username } },
            select: { name: true },
          });
          serviceNamesFilter = managedServices.map((s) => s.name);
        }

        if (filters.project) where.projectName = filters.project;
        if (filters.resource) where.resourceName = filters.resource;
        if (filters.resourceService) where.resourceService = filters.resourceService;
        if (filters.type) where.type = filters.type;
        if (serviceNamesFilter) where.serviceName = { in: serviceNamesFilter };
        else if (filters.serviceName) where.serviceName = filters.serviceName;

        if (filters.base || filters.environment || filters.network || filters.cluster) {
          where.location = {};
          if (filters.base) where.location.baseName = filters.base;
          if (filters.environment) where.location.environmentName = filters.environment;
          if (filters.network) where.location.networkName = filters.network;
          if (filters.cluster) where.location.clusterName = filters.cluster;
        }

        if (filters.projectType || filters.median || filters.year || filters.relatedTo || filters.emergencyOption || filters.priority) {
          where.project = {};
          if (filters.projectType) where.project.type = filters.projectType;
          if (filters.median) where.project.median = filters.median;
          if (filters.year) where.project.year = Number(filters.year);
          if (filters.relatedTo) where.project.relatedTo = { contains: filters.relatedTo, mode: 'insensitive' };
          if (filters.emergencyOption) where.project.emergencyOptionName = filters.emergencyOption;
          if (filters.priority) where.project.priority = filters.priority;
        }
        if (excludedIds && Array.isArray(excludedIds) && excludedIds.length > 0) {
          where.id = { notIn: excludedIds };
        }
      } else {
        return res.status(400).json({ error: "Either ids or selectAll+filters must be provided" });
      }

      const result = await demandService.bulkApprove(where, {
        status,
        approvedValue: requiresValueAndReason ? approvedValue : undefined,
        reason: requiresValueAndReason ? reason?.trim() : undefined,
      });

      res.json({ count: result.count });
    } catch (error) {
      console.error("demandController.bulkApprove error:", error);
      res.status(500).json({ error: "Failed to bulk approve demands" });
    }
  },

  bulkReject: async (req: Request, res: Response) => {
    try {
      const { username, isAdmin, isModerator } = getUserContext(req);
      const { ids, selectAll, filters, excludedIds, reason } = req.body;

      if (!reason || typeof reason !== 'string' || reason.trim() === '') {
        return res.status(400).json({ error: "reason is required for rejection" });
      }

      let where: any = {};

      if (ids && Array.isArray(ids) && ids.length > 0) {
        where.id = { in: ids };
      } else if (selectAll && filters) {
        let serviceNamesFilter: string[] | undefined;
        if (isModerator && !isAdmin) {
          const managedServices = await prisma.service.findMany({
            where: { moderators: { has: username } },
            select: { name: true },
          });
          serviceNamesFilter = managedServices.map((s) => s.name);
        }

        if (filters.project) where.projectName = filters.project;
        if (filters.resource) where.resourceName = filters.resource;
        if (filters.resourceService) where.resourceService = filters.resourceService;
        if (filters.type) where.type = filters.type;
        if (serviceNamesFilter) where.serviceName = { in: serviceNamesFilter };
        else if (filters.serviceName) where.serviceName = filters.serviceName;

        if (filters.base || filters.environment || filters.network || filters.cluster) {
          where.location = {};
          if (filters.base) where.location.baseName = filters.base;
          if (filters.environment) where.location.environmentName = filters.environment;
          if (filters.network) where.location.networkName = filters.network;
          if (filters.cluster) where.location.clusterName = filters.cluster;
        }

        if (filters.projectType || filters.median || filters.year || filters.relatedTo || filters.emergencyOption || filters.priority) {
          where.project = {};
          if (filters.projectType) where.project.type = filters.projectType;
          if (filters.median) where.project.median = filters.median;
          if (filters.year) where.project.year = Number(filters.year);
          if (filters.relatedTo) where.project.relatedTo = { contains: filters.relatedTo, mode: 'insensitive' };
          if (filters.emergencyOption) where.project.emergencyOptionName = filters.emergencyOption;
          if (filters.priority) where.project.priority = filters.priority;
        }
        if (excludedIds && Array.isArray(excludedIds) && excludedIds.length > 0) {
          where.id = { notIn: excludedIds };
        }
      } else {
        return res.status(400).json({ error: "Either ids or selectAll+filters must be provided" });
      }

      const result = await demandService.bulkReject(where, reason.trim());
      res.json({ count: result.count });
    } catch (error) {
      console.error("demandController.bulkReject error:", error);
      res.status(500).json({ error: "Failed to bulk reject demands" });
    }
  },

  getCenterPendingDemands: async (req: Request, res: Response) => {
    try {
      const user = req.auth!.user;
      if (!user.isCenterManager && !user.isAdmin) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      const centerName = user.isCenterManager ? user.centerName! : req.query.centerName as string;
      if (!centerName) return res.status(400).json({ message: 'centerName required' });

      const demands = await demandService.getDemandsByCenterAndStatus(centerName, 'PendingCenterManager');
      res.json(demands);
    } catch (error) {
      console.error("demandController.getCenterPendingDemands error:", error);
      res.status(500).json({ error: "Failed to fetch center pending demands" });
    }
  },

  cmApprove: async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const user = req.auth!.user;

      const demand = await demandService.findById(id);
      if (!demand) return res.status(404).json({ message: 'Demand not found' });
      if (!user.canManageCenter(demand.centerName)) {
        return res.status(403).json({ message: 'Forbidden: not your center' });
      }
      if (demand.status !== 'PendingCenterManager') {
        return res.status(400).json({ message: `Cannot approve: demand status is ${demand.status}` });
      }

      const updated = await demandService.cmApprove(id);
      res.json(updated);
    } catch (error) {
      console.error("demandController.cmApprove error:", error);
      res.status(500).json({ error: "Failed to approve demand" });
    }
  },

  cmReject: async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { reason } = req.body as { reason: string };
      if (!reason?.trim()) return res.status(400).json({ message: 'reason is required' });
      const user = req.auth!.user;

      const demand = await demandService.findById(id);
      if (!demand) return res.status(404).json({ message: 'Demand not found' });
      if (!user.canManageCenter(demand.centerName)) {
        return res.status(403).json({ message: 'Forbidden: not your center' });
      }
      if (demand.status !== 'PendingCenterManager') {
        return res.status(400).json({ message: `Cannot reject: demand status is ${demand.status}` });
      }

      const updated = await demandService.cmReject(id, reason);
      res.json(updated);
    } catch (error) {
      console.error("demandController.cmReject error:", error);
      res.status(500).json({ error: "Failed to reject demand" });
    }
  },

  restore: async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const user = req.auth!.user;

      const demand = await demandService.findById(id);
      if (!demand) return res.status(404).json({ message: 'Demand not found' });

      const restorableStatuses = ['Rejected', 'CenterManagerRejected'];
      if (!restorableStatuses.includes(demand.status)) {
        return res.status(400).json({ message: `Demand status '${demand.status}' cannot be restored` });
      }

      const isAdmin = user.hasAnyRole([settings.authAdminGroup]);
      const canRestore =
        isAdmin ||
        demand.createdBy === user.username ||
        user.canManageCenter(demand.centerName);

      if (!canRestore) return res.status(403).json({ message: 'Forbidden' });

      const updated = await demandService.restore(id);
      res.json(updated);
    } catch (error) {
      console.error("demandController.restore error:", error);
      res.status(500).json({ error: "Failed to restore demand" });
    }
  },

  getHistory: async (req: Request, res: Response) => {
    try {
      const user = req.auth!.user;
      const isAdmin = user.hasAnyRole([settings.authAdminGroup]);
      const isModerator = user.hasAnyRole([settings.authModeratorGroup]);
      const demands = await demandService.getHistory({
        username: user.username,
        centerName: user.isCenterManager ? user.centerName! : undefined,
        isAdmin,
        isModerator,
      });
      res.json(demands);
    } catch (error) {
      console.error("demandController.getHistory error:", error);
      res.status(500).json({ error: "Failed to fetch demand history" });
    }
  },

  approve: async (req: Request, res: Response) => {
    try {
      const { status, approvedValue, reason } = req.body;

      const validStatuses = [DemandStatus.Approved, DemandStatus.PartiallyApproved, DemandStatus.ApprovedWithCondition];

      // Validate status
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "status must be Approved, PartiallyApproved, or ApprovedWithCondition" });
      }

      const requiresValueAndReason = status === DemandStatus.PartiallyApproved || status === DemandStatus.ApprovedWithCondition;

      // Validate: approvedValue is required for PartiallyApproved and ApprovedWithCondition
      if (requiresValueAndReason && (approvedValue === undefined || approvedValue === null)) {
        return res.status(400).json({ error: "approvedValue is required for PartiallyApproved and ApprovedWithCondition status" });
      }

      // Validate: reason is required for PartiallyApproved and ApprovedWithCondition
      if (requiresValueAndReason && (!reason || typeof reason !== 'string' || reason.trim() === '')) {
        return res.status(400).json({ error: "reason is required for PartiallyApproved and ApprovedWithCondition status" });
      }

      const demand = await demandService.approve(Number(req.params.id), {
        status,
        approvedValue: requiresValueAndReason ? approvedValue : undefined,
        reason: requiresValueAndReason ? reason.trim() : undefined,
      });
      res.json(demand);
    } catch (error) {
      console.error("demandController.approve error:", error);
      res.status(400).json({ error: "Failed to approve demand" });
    }
  },
};
