import { Request, Response } from "express";
import { sectionService } from "../../services/organization/section.service";

export const sectionController = {
  getAll: async (_req: Request, res: Response) => {
    try {
      const sections = await sectionService.findAll();
      res.json(sections);
    } catch (error) {
      console.error("sectionController.getAll error:", error);
      res.status(500).json({ error: "Failed to fetch sections" });
    }
  },

  getByKey: async (req: Request, res: Response) => {
    try {
      const { centerName, branchName, name } = req.params;
      const section = await sectionService.findByKey(name, branchName, centerName);
      if (!section) {
        return res.status(404).json({ error: "Section not found" });
      }
      res.json(section);
    } catch (error) {
      console.error("sectionController.getByKey error:", error);
      res.status(500).json({ error: "Failed to fetch section" });
    }
  },

  getByBranch: async (req: Request, res: Response) => {
    try {
      const { centerName, branchName } = req.params;
      const sections = await sectionService.findByBranch(branchName, centerName);
      res.json(sections);
    } catch (error) {
      console.error("sectionController.getByBranch error:", error);
      res.status(500).json({ error: "Failed to fetch sections" });
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const { name, branchName, branchCenter, displayName } = req.body;
      const section = await sectionService.create(name, branchName, branchCenter, displayName);
      res.status(201).json(section);
    } catch (error) {
      console.error("sectionController.create error:", error);
      res.status(400).json({ error: "Failed to create section" });
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const { centerName, branchName, name } = req.params;
      const { name: newName, displayName, isActive } = req.body;
      const section = await sectionService.update(name, branchName, centerName, { name: newName, displayName, isActive });
      res.json(section);
    } catch (error) {
      console.error("sectionController.update error:", error);
      res.status(400).json({ error: "Failed to update section" });
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const { centerName, branchName, name } = req.params;
      await sectionService.delete(name, branchName, centerName);
      res.status(204).send();
    } catch (error) {
      console.error("sectionController.delete error:", error);
      res.status(400).json({ error: "Failed to delete section" });
    }
  },
};
