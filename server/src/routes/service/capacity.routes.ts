import { Router } from "express";
import { capacityController } from "../../controllers/service/capacity.controller";
import { authenticate } from "../../middleware/openIdConnect";
import { requireAuth, requireRoles } from "../../middleware/authorization";
import { settings } from "../../lib/settings";

const requireModerator = requireRoles(settings.authAdminGroup, settings.authModeratorGroup);

const router = Router();

router.get("/", authenticate, requireAuth, capacityController.getAll);
router.get("/location/:locationId", authenticate, requireAuth, capacityController.getByLocation);
router.get("/resource/:serviceName/:resourceName", authenticate, requireAuth, capacityController.getByResource);
router.get("/:id", authenticate, requireAuth, capacityController.getById);
router.post("/", authenticate, requireModerator, capacityController.create);
router.put("/:id", authenticate, requireModerator, capacityController.update);
router.delete("/:id", authenticate, requireModerator, capacityController.delete);

export default router;
