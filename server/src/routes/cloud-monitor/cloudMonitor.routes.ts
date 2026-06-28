import { Router } from 'express';
import { authenticate } from '../../middleware/openIdConnect';
import { requireAuth, requireRoles } from '../../middleware/authorization';
import { settings } from '../../lib/settings';
import { cloudMonitorController } from '../../controllers/cloud-monitor/cloudMonitor.controller';

const router = Router();

const requireModerator = requireRoles(settings.authAdminGroup, settings.authModeratorGroup);
const requireAdmin = requireRoles(settings.authAdminGroup);

router.get('/flat', authenticate, requireAuth,      cloudMonitorController.getAllFlat);
router.get('/',     authenticate, requireAuth,      cloudMonitorController.getAll);
router.post('/',    authenticate, requireAdmin,     cloudMonitorController.create);
router.put('/:id',  authenticate, requireModerator, cloudMonitorController.update);
router.delete('/:id', authenticate, requireAdmin,  cloudMonitorController.delete);

export default router;
