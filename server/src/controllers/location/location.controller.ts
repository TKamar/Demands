import { Request, Response } from "express";
import { locationService } from "../../services/location/location.service";

export const locationController = {
  getAll: async (_req: Request, res: Response) => {
    try {
      const locations = await locationService.findAll();
      res.json(locations);
    } catch (error) {
      console.error("locationController.getAll error:", error);
      res.status(500).json({ error: "Failed to fetch locations" });
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const location = await locationService.findById(Number(req.params.id));
      if (!location) {
        return res.status(404).json({ error: "Location not found" });
      }
      res.json(location);
    } catch (error) {
      console.error("locationController.getById error:", error);
      res.status(500).json({ error: "Failed to fetch location" });
    }
  },

  getByComposite: async (req: Request, res: Response) => {
    try {
      const { baseName, environmentName, networkName, clusterName } = req.params;
      const location = await locationService.findByComposite(
        baseName,
        environmentName,
        networkName,
        clusterName
      );
      if (!location) {
        return res.status(404).json({ error: "Location not found" });
      }
      res.json(location);
    } catch (error) {
      console.error("locationController.getByComposite error:", error);
      res.status(500).json({ error: "Failed to fetch location" });
    }
  },

  getByFilters: async (req: Request, res: Response) => {
    try {
      const { base, environment, network, cluster } = req.query;
      const locations = await locationService.findByFilters({
        baseName: base as string | undefined,
        environmentName: environment as string | undefined,
        networkName: network as string | undefined,
        clusterName: cluster as string | undefined,
      });
      res.json(locations);
    } catch (error) {
      console.error("locationController.getByFilters error:", error);
      res.status(500).json({ error: "Failed to fetch locations" });
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const { baseName, environmentName, networkName, clusterName } = req.body;
      const location = await locationService.create(
        baseName,
        environmentName,
        networkName,
        clusterName
      );
      res.status(201).json(location);
    } catch (error) {
      console.error("locationController.create error:", error);
      res.status(400).json({ error: "Failed to create location" });
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const { baseName, environmentName, networkName, clusterName, isActive } = req.body;
      const location = await locationService.update(Number(req.params.id), {
        baseName,
        environmentName,
        networkName,
        clusterName,
        isActive,
      });
      res.json(location);
    } catch (error) {
      console.error("locationController.update error:", error);
      res.status(400).json({ error: "Failed to update location" });
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      await locationService.delete(Number(req.params.id));
      res.status(204).send();
    } catch (error) {
      console.error("locationController.delete error:", error);
      res.status(400).json({ error: "Failed to delete location" });
    }
  },
};
