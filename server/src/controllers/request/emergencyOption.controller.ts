import { Request, Response } from "express";
import { emergencyOptionService } from "../../services/request/emergencyOption.service";

export const emergencyOptionController = {
    getAll: async (_req: Request, res: Response) => {
        try {
            const emergencyOptions = await emergencyOptionService.findAll();
            res.json(emergencyOptions);
        } catch (error) {
            console.error("emergencyOptionController.getAll error:", error);
            res.status(500).json({ error: "Failed to fetch emergency options" });
        }
    },

    create: async (req: Request, res: Response) => {
        try {
            const { name } = req.body;
            if (!name) {
                return res.status(400).json({ error: "Name is required" });
            }

            const existing = await emergencyOptionService.findByName(name);
            if (existing) {
                return res.status(409).json({ error: "Emergency option already exists" });
            }

            const emergencyOption = await emergencyOptionService.create({ name });
            res.status(201).json(emergencyOption);
        } catch (error) {
            console.error("emergencyOptionController.create error:", error);
            res.status(500).json({ error: "Failed to create emergency option" });
        }
    },

    update: async (req: Request, res: Response) => {
        try {
            const { name } = req.body;
            const emergencyOption = await emergencyOptionService.update(req.params.name, { name });
            res.json(emergencyOption);
        } catch (error) {
            console.error("emergencyOptionController.update error:", error);
            res.status(400).json({ error: "Failed to update emergency option" });
        }
    },

    delete: async (req: Request, res: Response) => {
        try {
            await emergencyOptionService.delete(req.params.name);
            res.status(204).send();
        } catch (error) {
            console.error("emergencyOptionController.delete error:", error);
            res.status(400).json({ error: "Failed to delete emergency option" });
        }
    },
};
