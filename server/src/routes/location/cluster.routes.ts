import { Router } from "express";
import { clusterController } from "../../controllers/location/cluster.controller";
import { authenticate } from "../../middleware/openIdConnect";
import { requireAuth, requireAdmin } from "../../middleware/authorization";

const router = Router();

router.get("/", authenticate, requireAuth, clusterController.getAll);
router.get("/:name", authenticate, requireAuth, clusterController.getByName);
router.post("/", authenticate, requireAdmin, clusterController.create);
router.put("/:name", authenticate, requireAdmin, clusterController.update);
router.delete("/:name", authenticate, requireAdmin, clusterController.delete);

export default router;
