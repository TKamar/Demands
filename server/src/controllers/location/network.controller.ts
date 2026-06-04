import { Request, Response } from "express";
import { networkService } from "../../services/location/network.service";

export const networkController = {
  getAll: async (_req: Request, res: Response) => {
    try {
      const networks = await networkService.findAll();
      res.json(networks);
    } catch (error) {
      console.error("networkController.getAll error:", error);
      res.status(500).json({ error: "Failed to fetch networks" });
    }
  },

  getByName: async (req: Request, res: Response) => {
    try {
      const network = await networkService.findByName(req.params.name);
      if (!network) {
        return res.status(404).json({ error: "Network not found" });
      }
      res.json(network);
    } catch (error) {
      console.error("networkController.getByName error:", error);
      res.status(500).json({ error: "Failed to fetch network" });
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const { name, displayName } = req.body;
      const network = await networkService.create(name, displayName);
      res.status(201).json(network);
    } catch (error) {
      console.error("networkController.create error:", error);
      res.status(400).json({ error: "Failed to create network" });
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const { name, displayName, isActive } = req.body;
      const network = await networkService.update(req.params.name, { name, displayName, isActive });
      res.json(network);
    } catch (error) {
      console.error("networkController.update error:", error);
      res.status(400).json({ error: "Failed to update network" });
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      await networkService.delete(req.params.name);
      res.status(204).send();
    } catch (error) {
      console.error("networkController.delete error:", error);
      res.status(400).json({ error: "Failed to delete network" });
    }
  },
};
