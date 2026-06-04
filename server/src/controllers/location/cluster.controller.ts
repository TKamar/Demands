import { Request, Response } from "express";
import { clusterService } from "../../services/location/cluster.service";

export const clusterController = {
  getAll: async (_req: Request, res: Response) => {
    try {
      const clusters = await clusterService.findAll();
      res.json(clusters);
    } catch (error) {
      console.error("clusterController.getAll error:", error);
      res.status(500).json({ error: "Failed to fetch clusters" });
    }
  },

  getByName: async (req: Request, res: Response) => {
    try {
      const cluster = await clusterService.findByName(req.params.name);
      if (!cluster) {
        return res.status(404).json({ error: "Cluster not found" });
      }
      res.json(cluster);
    } catch (error) {
      console.error("clusterController.getByName error:", error);
      res.status(500).json({ error: "Failed to fetch cluster" });
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const { name, displayName } = req.body;
      const cluster = await clusterService.create(name, displayName);
      res.status(201).json(cluster);
    } catch (error) {
      console.error("clusterController.create error:", error);
      res.status(400).json({ error: "Failed to create cluster" });
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const { name, displayName, isActive } = req.body;
      const cluster = await clusterService.update(req.params.name, { name, displayName, isActive });
      res.json(cluster);
    } catch (error) {
      console.error("clusterController.update error:", error);
      res.status(400).json({ error: "Failed to update cluster" });
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      await clusterService.delete(req.params.name);
      res.status(204).send();
    } catch (error) {
      console.error("clusterController.delete error:", error);
      res.status(400).json({ error: "Failed to delete cluster" });
    }
  },
};
