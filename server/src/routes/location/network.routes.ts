import { Router } from "express";
import { networkController } from "../../controllers/location/network.controller";
import { authenticate } from "../../middleware/openIdConnect";
import { requireAuth, requireAdmin } from "../../middleware/authorization";

const router = Router();

router.get("/", authenticate, requireAuth, networkController.getAll);
router.get("/:name", authenticate, requireAuth, networkController.getByName);
router.post("/", authenticate, requireAdmin, networkController.create);
router.put("/:name", authenticate, requireAdmin, networkController.update);
router.delete("/:name", authenticate, requireAdmin, networkController.delete);

export default router;
