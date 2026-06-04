import { Router } from "express";
import { baseController } from "../../controllers/location/base.controller";
import { authenticate } from "../../middleware/openIdConnect";
import { requireAuth, requireAdmin } from "../../middleware/authorization";

const router = Router();

router.get("/", authenticate, requireAuth, baseController.getAll);
router.get("/:name", authenticate, requireAuth, baseController.getByName);
router.post("/", authenticate, requireAdmin, baseController.create);
router.put("/:name", authenticate, requireAdmin, baseController.update);
router.delete("/:name", authenticate, requireAdmin, baseController.delete);

export default router;
