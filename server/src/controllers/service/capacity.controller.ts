import { Request, Response } from "express";
import { capacityService } from "../../services/service/capacity.service";
import { settings } from "../../lib/settings";

export const capacityController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const user = req.auth?.user;

      // Admins get all capacities
      if (user?.hasRole(settings.authAdminGroup)) {
        const capacities = await capacityService.findAll();
        return res.json(capacities);
      }

      // Moderators get only capacities for services they moderate
      if (user?.hasRole(settings.authModeratorGroup) && user.username) {
        const moderatorServices = await capacityService.getModeratorServices(user.username);
        const capacities = await capacityService.findByServices(moderatorServices);
        return res.json(capacities);
      }

      // Other authenticated users get all capacities (read-only)
      const capacities = await capacityService.findAll();
      res.json(capacities);
    } catch (error) {
      console.error("capacityController.getAll error:", error);
      res.status(500).json({ error: "Failed to fetch capacities" });
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const capacity = await capacityService.findById(Number(req.params.id));
      if (!capacity) {
        return res.status(404).json({ error: "Capacity not found" });
      }
      res.json(capacity);
    } catch (error) {
      console.error("capacityController.getById error:", error);
      res.status(500).json({ error: "Failed to fetch capacity" });
    }
  },

  getByLocation: async (req: Request, res: Response) => {
    try {
      const capacities = await capacityService.findByLocation(Number(req.params.locationId));
      res.json(capacities);
    } catch (error) {
      console.error("capacityController.getByLocation error:", error);
      res.status(500).json({ error: "Failed to fetch capacities" });
    }
  },

  getByResource: async (req: Request, res: Response) => {
    try {
      const { serviceName, resourceName } = req.params;
      const capacities = await capacityService.findByResource(resourceName, serviceName);
      res.json(capacities);
    } catch (error) {
      console.error("capacityController.getByResource error:", error);
      res.status(500).json({ error: "Failed to fetch capacities" });
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const { locationId, resourceName, resourceService, value } = req.body;
      const user = req.auth?.user;

      // Permission check
      if (!user?.hasRole(settings.authAdminGroup)) {
        if (!user || !user.username) return res.status(401).json({ error: "Unauthorized" });
        const moderatorServices = await capacityService.getModeratorServices(user.username);
        if (!moderatorServices.includes(resourceService)) {
          return res.status(403).json({ error: `You are not a moderator for service: ${resourceService}` });
        }
      }

      const capacity = await capacityService.create(
        locationId,
        resourceName,
        resourceService,
        value
      );
      res.status(201).json(capacity);
    } catch (error) {
      console.error("capacityController.create error:", error);
      res.status(400).json({ error: "Failed to create capacity" });
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const { value } = req.body;
      const id = Number(req.params.id);
      const user = req.auth?.user;

      // Permission check
      if (!user?.hasRole(settings.authAdminGroup)) {
        if (!user || !user.username) return res.status(401).json({ error: "Unauthorized" });

        const existingCapacity = await capacityService.findById(id);
        if (!existingCapacity) return res.status(404).json({ error: "Capacity not found" });

        const moderatorServices = await capacityService.getModeratorServices(user.username);
        if (!moderatorServices.includes(existingCapacity.resourceService)) {
          return res.status(403).json({ error: `You are not a moderator for service: ${existingCapacity.resourceService}` });
        }
      }

      const capacity = await capacityService.update(id, value);
      res.json(capacity);
    } catch (error) {
      console.error("capacityController.update error:", error);
      res.status(400).json({ error: "Failed to update capacity" });
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const user = req.auth?.user;

      // Permission check
      if (!user?.hasRole(settings.authAdminGroup)) {
        if (!user || !user.username) return res.status(401).json({ error: "Unauthorized" });

        const existingCapacity = await capacityService.findById(id);
        if (!existingCapacity) return res.status(404).json({ error: "Capacity not found" });

        const moderatorServices = await capacityService.getModeratorServices(user.username);
        if (!moderatorServices.includes(existingCapacity.resourceService)) {
          return res.status(403).json({ error: `You are not a moderator for service: ${existingCapacity.resourceService}` });
        }
      }

      await capacityService.delete(id);
      res.status(204).send();
    } catch (error) {
      console.error("capacityController.delete error:", error);
      res.status(400).json({ error: "Failed to delete capacity" });
    }
  },
};
