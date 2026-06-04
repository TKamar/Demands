import { Router } from "express";
import { centerController } from "../../controllers/organization/center.controller";
import { authenticate } from "../../middleware/openIdConnect";
import { requireAuth, requireAdmin } from "../../middleware/authorization";

const router = Router();

router.get("/", authenticate, requireAuth, centerController.getAll);
router.get("/:name", authenticate, requireAuth, centerController.getByName);
router.post("/", authenticate, requireAdmin, centerController.create);
router.put("/:name", authenticate, requireAdmin, centerController.update);
router.delete("/:name", authenticate, requireAdmin, centerController.delete);

export default router;
