import { Router } from 'express';
import { userController } from '../../controllers/admin/user.controller';
import { requireAuth, requireAdmin } from '../../middleware/authorization';

const router = Router();
router.get('/', requireAuth, requireAdmin, userController.getAll);
router.patch('/:username', requireAuth, requireAdmin, userController.updateUser);
export default router;
