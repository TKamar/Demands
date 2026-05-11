import { Router } from "express";
import { authenticate } from "../../middleware/openIdConnect";
import { requireAuth } from "../../middleware/authorization";
import { notificationController } from "../../controllers/notification/notification.controller";

const router = Router();

router.get("/", authenticate, requireAuth, notificationController.list);
router.patch("/read-all", authenticate, requireAuth, notificationController.markAllRead);
router.patch("/:id/read", authenticate, requireAuth, notificationController.markRead);

export default router;
