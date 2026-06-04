import { Router } from "express";
import { resourceController } from "../../controllers/service/resource.controller";
import { authenticate } from "../../middleware/openIdConnect";
import { requireAuth, requireRoles } from "../../middleware/authorization";
import { settings } from "../../lib/settings";

const requireModerator = requireRoles(settings.authAdminGroup, settings.authModeratorGroup);

const router = Router();

router.get("/", authenticate, requireAuth, resourceController.getAll);
router.get("/service/:serviceName", authenticate, requireAuth, resourceController.getByService);
router.get("/:serviceName/:name", authenticate, requireAuth, resourceController.getByKey);
router.post("/", authenticate, requireModerator, resourceController.create);
router.put("/:serviceName/:name", authenticate, requireModerator, resourceController.update);
router.delete("/:serviceName/:name", authenticate, requireModerator, resourceController.delete);

export default router;
