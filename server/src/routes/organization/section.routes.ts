import { Router } from "express";
import { sectionController } from "../../controllers/organization/section.controller";
import { authenticate } from "../../middleware/openIdConnect";
import { requireAuth, requireAdmin } from "../../middleware/authorization";

const router = Router();

router.get("/", authenticate, requireAuth, sectionController.getAll);
router.get("/branch/:centerName/:branchName", authenticate, requireAuth, sectionController.getByBranch);
router.get("/:centerName/:branchName/:name", authenticate, requireAuth, sectionController.getByKey);
router.post("/", authenticate, requireAdmin, sectionController.create);
router.put("/:centerName/:branchName/:name", authenticate, requireAdmin, sectionController.update);
router.delete("/:centerName/:branchName/:name", authenticate, requireAdmin, sectionController.delete);

export default router;
