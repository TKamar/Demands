import { Router } from "express";
import { projectController } from "../../controllers/request/project.controller";
import { authenticate } from "../../middleware/openIdConnect";
import { requireAuth } from "../../middleware/authorization";

const router = Router();

router.get("/", authenticate, requireAuth, projectController.getAll);
router.get("/filter", authenticate, requireAuth, projectController.getByFilters);
router.get("/:name", authenticate, requireAuth, projectController.getByName);
router.post("/", authenticate, requireAuth, projectController.create);
router.post("/:name/duplicate", authenticate, requireAuth, projectController.duplicate);
router.put("/:name", authenticate, requireAuth, projectController.update);
router.delete("/:name", authenticate, requireAuth, projectController.delete);

export default router;
