import { Router } from "express";
import { projectKindController } from "../../controllers/request/projectKind.controller";
import { authenticate } from "../../middleware/openIdConnect";
import { requireAuth, requireAdmin } from "../../middleware/authorization";

const router = Router();

router.get("/", authenticate, requireAuth, projectKindController.getAll);
router.post("/", authenticate, requireAdmin, projectKindController.create);
router.put("/:name", authenticate, requireAdmin, projectKindController.update);
router.delete("/:name", authenticate, requireAdmin, projectKindController.delete);

export default router;
