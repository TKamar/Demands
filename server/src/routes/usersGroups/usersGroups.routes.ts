import { Router } from 'express';
import { usersGroupsController } from '../../controllers/usersGroups/usersGroups.controller';
import { authenticate } from '../../middleware/openIdConnect';
import { requireAuth } from '../../middleware/authorization';

const router = Router();

// Protected endpoint - search users and groups
// Query param: ?search=xxx (min 3 chars)
router.get('/', authenticate, requireAuth, usersGroupsController.search);

export default router;
