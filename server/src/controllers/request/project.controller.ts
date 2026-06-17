import { Request, Response } from "express";
import { projectService } from "../../services/request/project.service";
import { ProjectType, Median } from "@prisma/client";
import { settings } from "../../lib/settings";
import { NotFoundError } from "../../lib/errors";
import prisma from "../../lib/prisma";

function getUserContext(req: Request) {
  const user = req.auth!.user;
  const isPrivileged = user.hasAnyRole([
    settings.authAdminGroup,
    settings.authModeratorGroup,
  ]);
  return {
    username: user.username,
    fullName: user.fullName ?? user.username ?? user.email ?? "Unknown",
    isPrivileged,
    isCenterManager: user.isCenterManager,
    centerName: user.centerName ?? undefined,
  };
}

export const projectController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const { username, isPrivileged, isCenterManager, centerName } = getUserContext(req);
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;

      const centerFilter = isCenterManager && !isPrivileged ? centerName : undefined;
      const result = await projectService.findAll(
        isPrivileged ? undefined : username,
        { page, limit },
        centerFilter
      );
      res.json(result);
    } catch (error) {
      console.error("projectController.getAll error:", error);
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  },

  getByFilters: async (req: Request, res: Response) => {
    try {
      const { username, isPrivileged, isCenterManager, centerName } = getUserContext(req);
      const { name, page: pageQuery, limit: limitQuery } = req.query;

      const page = Number(pageQuery) || 1;
      const limit = Number(limitQuery) || 10;

      const centerFilter = isCenterManager && !isPrivileged ? centerName : undefined;
      const createdByFilter = isPrivileged
        ? (typeof req.query.createdBy === 'string' ? req.query.createdBy : undefined)
        : isCenterManager
        ? undefined
        : username;
      const result = await projectService.findByFilters(
        {
          name: name as string | undefined,
          centerName: centerFilter,
          createdBy: createdByFilter,
        },
        { page, limit }
      );
      res.json(result);
    } catch (error) {
      console.error("projectController.getByFilters error:", error);
      res.status(500).json({ error: "Failed to fetch projects by filters" });
    }
  },

  getByName: async (req: Request, res: Response) => {
    try {
      const { username, isPrivileged } = getUserContext(req);
      const project = await projectService.findByName(req.params.name);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      if (!isPrivileged && project.createdBy !== username) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("projectController.getByName error:", error);
      res.status(500).json({ error: "Failed to fetch project" });
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const { username, fullName } = getUserContext(req);
      const { name, purpose, relatedTo, type, kind, locationId, emergencyOption, centerName, branchName, sectionName } = req.body;

      // Auto-derive year and median for Semiannual projects
      let year: number | undefined;
      let median: 'H1' | 'H2' | undefined;
      if (type === ProjectType.Semiannual) {
        const now = new Date();
        year = now.getFullYear();
        median = (now.getMonth() < 6 ? 'H1' : 'H2') as 'H1' | 'H2';
      }

      // Validate: emergencyOption is required if type is Emergency
      if (type === ProjectType.Emergency && !emergencyOption) {
        return res
          .status(400)
          .json({ error: "emergencyOption is required for Emergency projects" });
      }

      // Validate: location and its related entities must be active
      const location = await prisma.location.findUnique({
        where: { id: locationId },
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

      // Validate: organization fields are required
      if (!centerName) {
        return res.status(400).json({ error: "centerName is required" });
      }
      if (!branchName) {
        return res.status(400).json({ error: "branchName is required" });
      }
      if (!sectionName) {
        return res.status(400).json({ error: "sectionName is required" });
      }

      // Validate: center must be active
      const center = await prisma.center.findUnique({ where: { name: centerName } });
      if (!center) {
        return res.status(400).json({ error: "Center not found" });
      }
      if (!center.isActive) {
        return res.status(400).json({ error: "Center is not active" });
      }

      // Validate: branch must be active
      const branch = await prisma.branch.findUnique({
        where: { name_centerName: { name: branchName, centerName } },
      });
      if (!branch) {
        return res.status(400).json({ error: "Branch not found" });
      }
      if (!branch.isActive) {
        return res.status(400).json({ error: "Branch is not active" });
      }

      // Validate: section must be active
      const section = await prisma.section.findUnique({
        where: { name_branchName_branchCenter: { name: sectionName, branchName, branchCenter: centerName } },
      });
      if (!section) {
        return res.status(400).json({ error: "Section not found" });
      }
      if (!section.isActive) {
        return res.status(400).json({ error: "Section is not active" });
      }

      const project = await projectService.create({
        name,
        purpose,
        relatedTo: relatedTo || undefined,
        type,
        kindName: kind,
        locationId,
        year: type === ProjectType.Semiannual ? year : undefined,
        median: type === ProjectType.Semiannual ? median : undefined,
        emergencyOptionName: type === ProjectType.Emergency ? emergencyOption : undefined,
        centerName,
        branchName,
        sectionName,
        createdBy: username,
        createdByName: fullName,
      });
      res.status(201).json(project);
    } catch (error) {
      console.error("projectController.create error:", error);
      res.status(400).json({ error: "Failed to create project" });
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const { username, isPrivileged } = getUserContext(req);
      const { purpose, relatedTo, type, kind, locationId, year, median, emergencyOption, centerName, branchName, sectionName } = req.body;

      // If type is being updated to Semiannual, validate year and median
      if (type === ProjectType.Semiannual) {
        if (year === undefined || year === null) {
          return res
            .status(400)
            .json({ error: "year is required for Semiannual projects" });
        }
        if (!median) {
          return res
            .status(400)
            .json({ error: "median is required for Semiannual projects" });
        }
      }

      // If type is being updated to Emergency, validate emergencyOption
      if (type === ProjectType.Emergency && !emergencyOption) {
        return res
          .status(400)
          .json({ error: "emergencyOption is required for Emergency projects" });
      }

      // Fetch current project to compare values
      const currentProject = await projectService.findByName(req.params.name);
      if (!currentProject) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Validate organization fields if provided
      if (centerName) {
        const center = await prisma.center.findUnique({ where: { name: centerName } });
        if (!center) {
          return res.status(400).json({ error: "Center not found" });
        }
        // Only validate active status if the value is changing
        if (!center.isActive && center.name !== currentProject.centerName) {
          return res.status(400).json({ error: "Center is not active" });
        }
      }

      const targetCenter = centerName || currentProject.centerName;

      if (branchName) {
        const branch = await prisma.branch.findUnique({
          where: { name_centerName: { name: branchName, centerName: targetCenter } },
        });
        if (!branch) {
          return res.status(400).json({ error: "Branch not found" });
        }
        // Only validate active status if the value is changing
        if (!branch.isActive && branch.name !== currentProject.branchName) {
          return res.status(400).json({ error: "Branch is not active" });
        }
      }

      const targetBranch = branchName || currentProject.branchName;

      if (sectionName) {
        const section = await prisma.section.findUnique({
          where: { name_branchName_branchCenter: { name: sectionName, branchName: targetBranch, branchCenter: targetCenter } },
        });
        if (!section) {
          return res.status(400).json({ error: "Section not found" });
        }
        // Only validate active status if the value is changing
        if (!section.isActive && section.name !== currentProject.sectionName) {
          return res.status(400).json({ error: "Section is not active" });
        }
      }

      // If type is Emergency, clear year and median
      const updateData: {
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
      } = {};

      if (purpose !== undefined) updateData.purpose = purpose;
      if (relatedTo !== undefined) updateData.relatedTo = relatedTo || null;
      if (type !== undefined) updateData.type = type;
      if (kind !== undefined) updateData.kindName = kind;
      if (locationId !== undefined) updateData.locationId = locationId;

      if (type === ProjectType.Emergency) {
        updateData.year = null;
        updateData.median = null;
        updateData.emergencyOptionName = emergencyOption;
      } else if (type === ProjectType.Semiannual) {
        updateData.year = year;
        updateData.median = median;
        updateData.emergencyOptionName = null;
      } else if (year !== undefined) {
        updateData.year = year;
      }
      if (median !== undefined && type !== ProjectType.Emergency) {
        updateData.median = median;
      }
      if (emergencyOption !== undefined && type !== ProjectType.Semiannual) {
        updateData.emergencyOptionName = emergencyOption || null;
      }

      // Add organization fields if provided
      if (centerName !== undefined) updateData.centerName = centerName;
      if (branchName !== undefined) updateData.branchName = branchName;
      if (sectionName !== undefined) updateData.sectionName = sectionName;

      const project = await projectService.update(
        req.params.name,
        updateData,
        isPrivileged ? undefined : username
      );
      res.json(project);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ error: "Project not found" });
      }
      console.error("projectController.update error:", error);
      res.status(400).json({ error: "Failed to update project" });
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const { username, isPrivileged } = getUserContext(req);
      await projectService.delete(
        req.params.name,
        isPrivileged ? undefined : username
      );
      res.status(204).send();
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ error: "Project not found" });
      }
      if (error instanceof Error && error.message.includes("existing demands")) {
        return res.status(400).json({ error: error.message });
      }
      console.error("projectController.delete error:", error);
      res.status(400).json({ error: "Failed to delete project" });
    }
  },

  duplicate: async (req: Request, res: Response) => {
    try {
      const { username, fullName, isPrivileged } = getUserContext(req);
      const sourceName = req.params.name;
      const {
        name, purpose, relatedTo, type, kind, locationId,
        year, median, priority, emergencyOption,
        centerName, branchName, sectionName,
        demands,
      } = req.body;

      // Validate: name and purpose are required
      if (!name || !name.trim()) {
        return res.status(400).json({ error: "name is required" });
      }
      if (!purpose) {
        return res.status(400).json({ error: "purpose is required" });
      }

      // Verify source exists and caller owns it
      const sourceProject = await projectService.findByName(sourceName);
      if (!sourceProject) {
        return res.status(404).json({ error: "Project not found" });
      }
      if (!isPrivileged && sourceProject.createdBy !== username) {
        return res.status(404).json({ error: "Project not found" });
      }

      // New name must be unique
      const nameConflict = await prisma.project.findUnique({
        where: { name },
        select: { name: true },
      });
      if (nameConflict) {
        return res.status(400).json({ error: "A project with this name already exists" });
      }

      // Type-specific validation
      if (type === ProjectType.Semiannual) {
        if (year === undefined || year === null) {
          return res.status(400).json({ error: "year is required for Semiannual projects" });
        }
        if (!median) {
          return res.status(400).json({ error: "median is required for Semiannual projects" });
        }
      }
      if (type === ProjectType.Emergency && !emergencyOption) {
        return res.status(400).json({ error: "emergencyOption is required for Emergency projects" });
      }

      // Validate location
      const location = await prisma.location.findUnique({
        where: { id: locationId },
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

      // Validate org fields
      if (!centerName || !branchName || !sectionName) {
        return res.status(400).json({ error: "centerName, branchName, and sectionName are required" });
      }
      const center = await prisma.center.findUnique({ where: { name: centerName } });
      if (!center) {
        return res.status(400).json({ error: "Center not found" });
      }
      if (!center.isActive) {
        return res.status(400).json({ error: "Center is not active" });
      }
      const branch = await prisma.branch.findUnique({
        where: { name_centerName: { name: branchName, centerName } },
      });
      if (!branch) {
        return res.status(400).json({ error: "Branch not found" });
      }
      if (!branch.isActive) {
        return res.status(400).json({ error: "Branch is not active" });
      }
      const section = await prisma.section.findUnique({
        where: { name_branchName_branchCenter: { name: sectionName, branchName, branchCenter: centerName } },
      });
      if (!section) {
        return res.status(400).json({ error: "Section not found" });
      }
      if (!section.isActive) {
        return res.status(400).json({ error: "Section is not active" });
      }

      const project = await projectService.duplicate(
        sourceName,
        {
          name,
          purpose,
          relatedTo: relatedTo || undefined,
          type,
          kindName: kind,
          locationId,
          year: type === ProjectType.Semiannual ? year : undefined,
          median: type === ProjectType.Semiannual ? median : undefined,
          priority: priority || undefined,
          emergencyOptionName: type === ProjectType.Emergency ? emergencyOption : undefined,
          centerName,
          branchName,
          sectionName,
          createdBy: username,
          createdByName: fullName,
        },
        demands || []
      );

      res.status(201).json(project);
    } catch (error) {
      console.error("projectController.duplicate error:", error);
      res.status(400).json({ error: "Failed to duplicate project" });
    }
  },
};
