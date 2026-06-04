import { Request, Response } from "express";
import { resourceService } from "../../services/service/resource.service";

export const resourceController = {
  getAll: async (_req: Request, res: Response) => {
    try {
      const resources = await resourceService.findAll();
      res.json(resources);
    } catch (error) {
      console.error("resourceController.getAll error:", error);
      res.status(500).json({ error: "Failed to fetch resources" });
    }
  },

  getByKey: async (req: Request, res: Response) => {
    try {
      const { serviceName, name } = req.params;
      const resource = await resourceService.findByKey(name, serviceName);
      if (!resource) {
        return res.status(404).json({ error: "Resource not found" });
      }
      res.json(resource);
    } catch (error) {
      console.error("resourceController.getByKey error:", error);
      res.status(500).json({ error: "Failed to fetch resource" });
    }
  },

  getByService: async (req: Request, res: Response) => {
    try {
      const resources = await resourceService.findByService(req.params.serviceName);
      res.json(resources);
    } catch (error) {
      console.error("resourceController.getByService error:", error);
      res.status(500).json({ error: "Failed to fetch resources" });
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const { name, unit, serviceName } = req.body;
      const resource = await resourceService.create(name, unit, serviceName);
      res.status(201).json(resource);
    } catch (error) {
      console.error("resourceController.create error:", error);
      res.status(400).json({ error: "Failed to create resource" });
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const { serviceName, name } = req.params;
      const { name: newName, unit, isActive } = req.body;
      const resource = await resourceService.update(name, serviceName, {
        name: newName,
        unit,
        isActive,
      });
      res.json(resource);
    } catch (error) {
      console.error("resourceController.update error:", error);
      res.status(400).json({ error: "Failed to update resource" });
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const { serviceName, name } = req.params;
      await resourceService.delete(name, serviceName);
      res.status(204).send();
    } catch (error) {
      console.error("resourceController.delete error:", error);
      res.status(400).json({ error: "Failed to delete resource" });
    }
  },
};
