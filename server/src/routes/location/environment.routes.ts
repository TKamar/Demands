import { Router } from "express";
import { environmentController } from "../../controllers/location/environment.controller";
import { authenticate } from "../../middleware/openIdConnect";
import { requireAuth, requireAdmin } from "../../middleware/authorization";

const router = Router();

router.get("/", authenticate, requireAuth, environmentController.getAll);
router.get("/:name", authenticate, requireAuth, environmentController.getByName);
router.post("/", authenticate, requireAdmin, environmentController.create);
router.put("/:name", authenticate, requireAdmin, environmentController.update);
router.delete("/:name", authenticate, requireAdmin, environmentController.delete);

export default router;
