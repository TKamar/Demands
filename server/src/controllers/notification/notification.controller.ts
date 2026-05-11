import type { Request, Response } from "express";
import { notificationService } from "../../services/notification/notification.service";

export const notificationController = {
  async list(req: Request, res: Response) {
    try {
      const user = req.auth!.user;
      const isAdmin = user.hasRole("admin");
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

      const result = await notificationService.getUserNotifications(
        user.username!,
        isAdmin,
        page,
        limit
      );
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch notifications";
      res.status(500).json({ error: message });
    }
  },

  async markRead(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (!id || isNaN(id)) return res.status(400).json({ error: "Invalid id" });
      const user = req.auth!.user;
      const updated = await notificationService.markRead(id, user.username!);
      res.json(updated);
    } catch (err) {
      if (err instanceof Error && err.message === "Notification not found") {
        return res.status(404).json({ error: err.message });
      }
      const message = err instanceof Error ? err.message : "Failed to mark notification as read";
      res.status(500).json({ error: message });
    }
  },

  async markAllRead(req: Request, res: Response) {
    try {
      const user = req.auth!.user;
      const isAdmin = user.hasRole("admin");
      await notificationService.markAllRead(user.username!, isAdmin);
      res.json({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to mark all notifications as read";
      res.status(500).json({ error: message });
    }
  },
};
