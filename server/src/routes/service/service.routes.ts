import { Router } from "express";
import { serviceController } from "../../controllers/service/service.controller";
import { authenticate } from "../../middleware/openIdConnect";
import { requireAuth, requireRoles } from "../../middleware/authorization";
import { settings } from "../../lib/settings";

const requireModerator = requireRoles(settings.authAdminGroup, settings.authModeratorGroup);

const router = Router();

router.get("/", authenticate, requireAuth, serviceController.getAll);
router.get("/mine", authenticate, requireAuth, serviceController.getMine);
router.get("/:name", authenticate, requireAuth, serviceController.getByName);
router.post("/", authenticate, requireModerator, serviceController.create);
router.put("/:name", authenticate, requireModerator, serviceController.update);
router.delete("/:name", authenticate, requireModerator, serviceController.delete);

export default router;
