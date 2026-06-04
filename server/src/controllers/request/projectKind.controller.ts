import { Request, Response } from "express";
import { projectKindService } from "../../services/request/projectKind.service";

export const projectKindController = {
    getAll: async (_req: Request, res: Response) => {
        try {
            const kinds = await projectKindService.findAll();
            res.json(kinds);
        } catch (error) {
            console.error("projectKindController.getAll error:", error);
            res.status(500).json({ error: "Failed to fetch project kinds" });
        }
    },

    create: async (req: Request, res: Response) => {
        try {
            const { name, displayName } = req.body;
            if (!name) {
                return res.status(400).json({ error: "Name is required" });
            }

            const existing = await projectKindService.findByName(name);
            if (existing) {
                return res.status(409).json({ error: "Project kind already exists" });
            }

            const kind = await projectKindService.create({ name, displayName });
            res.status(201).json(kind);
        } catch (error) {
            console.error("projectKindController.create error:", error);
            res.status(500).json({ error: "Failed to create project kind" });
        }
    },

    update: async (req: Request, res: Response) => {
        try {
            const { displayName } = req.body;
            const kind = await projectKindService.update(req.params.name, { displayName });
            res.json(kind);
        } catch (error) {
            console.error("projectKindController.update error:", error);
            res.status(400).json({ error: "Failed to update project kind" });
        }
    },

    delete: async (req: Request, res: Response) => {
        try {
            await projectKindService.delete(req.params.name);
            res.status(204).send();
        } catch (error) {
            console.error("projectKindController.delete error:", error);
            res.status(400).json({ error: "Failed to delete project kind" });
        }
    },
};
