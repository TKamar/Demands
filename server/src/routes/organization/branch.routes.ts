import { Router } from "express";
import { branchController } from "../../controllers/organization/branch.controller";
import { authenticate } from "../../middleware/openIdConnect";
import { requireAuth, requireAdmin } from "../../middleware/authorization";

const router = Router();

router.get("/", authenticate, requireAuth, branchController.getAll);
router.get("/center/:centerName", authenticate, requireAuth, branchController.getByCenter);
router.get("/:centerName/:name", authenticate, requireAuth, branchController.getByKey);
router.post("/", authenticate, requireAdmin, branchController.create);
router.put("/:centerName/:name", authenticate, requireAdmin, branchController.update);
router.delete("/:centerName/:name", authenticate, requireAdmin, branchController.delete);

export default router;
