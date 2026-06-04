import { Request, Response } from "express";
import { baseService } from "../../services/location/base.service";

export const baseController = {
  getAll: async (_req: Request, res: Response) => {
    try {
      const bases = await baseService.findAll();
      res.json(bases);
    } catch (error) {
      console.error("baseController.getAll error:", error);
      res.status(500).json({ error: "Failed to fetch bases" });
    }
  },

  getByName: async (req: Request, res: Response) => {
    try {
      const base = await baseService.findByName(req.params.name);
      if (!base) {
        return res.status(404).json({ error: "Base not found" });
      }
      res.json(base);
    } catch (error) {
      console.error("baseController.getByName error:", error);
      res.status(500).json({ error: "Failed to fetch base" });
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const { name, displayName } = req.body;
      const base = await baseService.create(name, displayName);
      res.status(201).json(base);
    } catch (error) {
      console.error("baseController.create error:", error);
      res.status(400).json({ error: "Failed to create base" });
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const { name, displayName, isActive } = req.body;
      const base = await baseService.update(req.params.name, { name, displayName, isActive });
      res.json(base);
    } catch (error) {
      console.error("baseController.update error:", error);
      res.status(400).json({ error: "Failed to update base" });
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      await baseService.delete(req.params.name);
      res.status(204).send();
    } catch (error) {
      console.error("baseController.delete error:", error);
      res.status(400).json({ error: "Failed to delete base" });
    }
  },
};
