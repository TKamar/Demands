import { Request, Response } from "express";
import { branchService } from "../../services/organization/branch.service";

export const branchController = {
  getAll: async (_req: Request, res: Response) => {
    try {
      const branches = await branchService.findAll();
      res.json(branches);
    } catch (error) {
      console.error("branchController.getAll error:", error);
      res.status(500).json({ error: "Failed to fetch branches" });
    }
  },

  getByKey: async (req: Request, res: Response) => {
    try {
      const { centerName, name } = req.params;
      const branch = await branchService.findByKey(name, centerName);
      if (!branch) {
        return res.status(404).json({ error: "Branch not found" });
      }
      res.json(branch);
    } catch (error) {
      console.error("branchController.getByKey error:", error);
      res.status(500).json({ error: "Failed to fetch branch" });
    }
  },

  getByCenter: async (req: Request, res: Response) => {
    try {
      const branches = await branchService.findByCenter(req.params.centerName);
      res.json(branches);
    } catch (error) {
      console.error("branchController.getByCenter error:", error);
      res.status(500).json({ error: "Failed to fetch branches" });
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const { name, centerName, displayName } = req.body;
      const branch = await branchService.create(name, centerName, displayName);
      res.status(201).json(branch);
    } catch (error) {
      console.error("branchController.create error:", error);
      res.status(400).json({ error: "Failed to create branch" });
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const { centerName, name } = req.params;
      const { name: newName, displayName, isActive } = req.body;
      const branch = await branchService.update(name, centerName, { name: newName, displayName, isActive });
      res.json(branch);
    } catch (error) {
      console.error("branchController.update error:", error);
      res.status(400).json({ error: "Failed to update branch" });
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const { centerName, name } = req.params;
      await branchService.delete(name, centerName);
      res.status(204).send();
    } catch (error) {
      console.error("branchController.delete error:", error);
      res.status(400).json({ error: "Failed to delete branch" });
    }
  },
};
