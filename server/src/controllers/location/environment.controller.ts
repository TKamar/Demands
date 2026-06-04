import { Request, Response } from "express";
import { environmentService } from "../../services/location/environment.service";

export const environmentController = {
  getAll: async (_req: Request, res: Response) => {
    try {
      const environments = await environmentService.findAll();
      res.json(environments);
    } catch (error) {
      console.error("environmentController.getAll error:", error);
      res.status(500).json({ error: "Failed to fetch environments" });
    }
  },

  getByName: async (req: Request, res: Response) => {
    try {
      const environment = await environmentService.findByName(req.params.name);
      if (!environment) {
        return res.status(404).json({ error: "Environment not found" });
      }
      res.json(environment);
    } catch (error) {
      console.error("environmentController.getByName error:", error);
      res.status(500).json({ error: "Failed to fetch environment" });
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const { name, displayName } = req.body;
      const environment = await environmentService.create(name, displayName);
      res.status(201).json(environment);
    } catch (error) {
      console.error("environmentController.create error:", error);
      res.status(400).json({ error: "Failed to create environment" });
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const { name, displayName, isActive } = req.body;
      const environment = await environmentService.update(req.params.name, { name, displayName, isActive });
      res.json(environment);
    } catch (error) {
      console.error("environmentController.update error:", error);
      res.status(400).json({ error: "Failed to update environment" });
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      await environmentService.delete(req.params.name);
      res.status(204).send();
    } catch (error) {
      console.error("environmentController.delete error:", error);
      res.status(400).json({ error: "Failed to delete environment" });
    }
  },
};
