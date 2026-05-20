import { Router } from 'express';
import { userController } from '../../controllers/admin/user.controller';
import { authenticate } from '../../middleware/openIdConnect';
import { requireAuth, requireAdmin } from '../../middleware/authorization';

const router = Router();
router.get('/', authenticate, requireAuth, requireAdmin, userController.getAll);
router.patch('/:username', authenticate, requireAuth, requireAdmin, userController.updateUser);
export default router;
