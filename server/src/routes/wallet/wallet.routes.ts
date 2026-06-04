import { Router } from "express";
import { walletController } from "../../controllers/wallet/wallet.controller";
import { authenticate } from "../../middleware/openIdConnect";
import { requireRoles } from "../../middleware/authorization";
import { settings } from "../../lib/settings";

const requireModerator = requireRoles(settings.authAdminGroup, settings.authModeratorGroup);

const router = Router();

router.get("/", authenticate, requireModerator, walletController.getAll);
router.get("/filter", authenticate, requireModerator, walletController.getByFilters);
router.get("/:id", authenticate, requireModerator, walletController.getById);
router.post("/", authenticate, requireModerator, walletController.create);
router.put("/:id", authenticate, requireModerator, walletController.update);
router.delete("/:id", authenticate, requireModerator, walletController.delete);

export default router;
