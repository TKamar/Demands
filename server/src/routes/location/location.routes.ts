import { Router } from "express";
import { locationController } from "../../controllers/location/location.controller";
import { authenticate } from "../../middleware/openIdConnect";
import { requireAuth, requireAdmin } from "../../middleware/authorization";

const router = Router();

router.get("/", authenticate, requireAuth, locationController.getAll);
router.get("/filter", authenticate, requireAuth, locationController.getByFilters);
router.get("/composite/:baseName/:environmentName/:networkName/:clusterName", authenticate, requireAuth, locationController.getByComposite);
router.get("/:id", authenticate, requireAuth, locationController.getById);
router.post("/", authenticate, requireAdmin, locationController.create);
router.put("/:id", authenticate, requireAdmin, locationController.update);
router.delete("/:id", authenticate, requireAdmin, locationController.delete);

export default router;
