import { Router } from 'express';
import { authenticate } from '../../middleware/openIdConnect';
import { requireAuth, requireRoles } from '../../middleware/authorization';
import { settings } from '../../lib/settings';
import { cloudMonitorController } from '../../controllers/cloud-monitor/cloudMonitor.controller';

const router = Router();

const requireModerator = requireRoles(settings.authAdminGroup, settings.authModeratorGroup);

router.get('/',     authenticate, requireAuth,        cloudMonitorController.getAll);
router.put('/:id',  authenticate, requireModerator,   cloudMonitorController.update);

export default router;
