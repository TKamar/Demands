import { Request, Response } from "express";
import { centerService } from "../../services/organization/center.service";

export const centerController = {
  getAll: async (_req: Request, res: Response) => {
    try {
      const centers = await centerService.findAll();
      res.json(centers);
    } catch (error) {
      console.error("centerController.getAll error:", error);
      res.status(500).json({ error: "Failed to fetch centers" });
    }
  },

  getByName: async (req: Request, res: Response) => {
    try {
      const center = await centerService.findByName(req.params.name);
      if (!center) {
        return res.status(404).json({ error: "Center not found" });
      }
      res.json(center);
    } catch (error) {
      console.error("centerController.getByName error:", error);
      res.status(500).json({ error: "Failed to fetch center" });
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const { name, displayName } = req.body;
      const center = await centerService.create(name, displayName);
      res.status(201).json(center);
    } catch (error) {
      console.error("centerController.create error:", error);
      res.status(400).json({ error: "Failed to create center" });
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const { name, displayName, isActive } = req.body;
      const center = await centerService.update(req.params.name, { name, displayName, isActive });
      res.json(center);
    } catch (error) {
      console.error("centerController.update error:", error);
      res.status(400).json({ error: "Failed to update center" });
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      await centerService.delete(req.params.name);
      res.status(204).send();
    } catch (error) {
      console.error("centerController.delete error:", error);
      res.status(400).json({ error: "Failed to delete center" });
    }
  },
};
