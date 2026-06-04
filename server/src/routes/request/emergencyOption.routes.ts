import { Router } from "express";
import { emergencyOptionController } from "../../controllers/request/emergencyOption.controller";
import { authenticate } from "../../middleware/openIdConnect";
import { requireAuth, requireAdmin } from "../../middleware/authorization";

const router = Router();

router.get("/", authenticate, requireAuth, emergencyOptionController.getAll);
router.post("/", authenticate, requireAdmin, emergencyOptionController.create);
router.patch("/:name", authenticate, requireAdmin, emergencyOptionController.update);
router.delete("/:name", authenticate, requireAdmin, emergencyOptionController.delete);

export default router;
