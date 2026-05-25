import { Router } from "express";
import { demandController } from "../../controllers/request/demand.controller";
import { authenticate } from "../../middleware/openIdConnect";
import { requireAuth, requireRoles, requireCenterManager } from "../../middleware/authorization";
import { settings } from "../../lib/settings";

const router = Router();

const requireModerator = requireRoles(settings.authAdminGroup, settings.authModeratorGroup);

router.get("/", authenticate, requireAuth, demandController.getAll);
router.get("/filter", authenticate, requireAuth, demandController.getByFilters);
router.get("/center/pending", authenticate, requireAuth, requireCenterManager, demandController.getCenterPendingDemands);
router.get("/history", authenticate, requireAuth, demandController.getHistory);
router.patch("/bulk/approve", authenticate, requireModerator, demandController.bulkApprove);
router.patch("/bulk/reject", authenticate, requireModerator, demandController.bulkReject);
router.post("/group", authenticate, requireAuth, demandController.createGroup);
router.get("/:id", authenticate, requireAuth, demandController.getById);
router.post("/", authenticate, requireAuth, demandController.create);
router.patch("/:id", authenticate, requireAuth, demandController.update);
router.delete("/:id", authenticate, requireAuth, demandController.delete);
router.patch("/:id/cancel", authenticate, requireAuth, demandController.cancel);
router.patch("/:id/restore", authenticate, requireAuth, demandController.restore);
router.patch("/:id/reject", authenticate, requireModerator, demandController.reject);
router.patch("/:id/approve", authenticate, requireModerator, demandController.approve);
router.patch("/:id/assign", authenticate, requireAuth, requireCenterManager, demandController.assign);
router.patch("/:id/cm-approve", authenticate, requireAuth, requireCenterManager, demandController.centerManagerApprove);
router.patch("/:id/cm-reject", authenticate, requireAuth, requireCenterManager, demandController.centerManagerReject);
router.post("/:id/transfer", authenticate, requireModerator, demandController.transferDemand);

export default router;
