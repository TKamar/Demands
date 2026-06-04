import { Router } from 'express';
import { authController } from '../../controllers/auth/auth.controller';
import { authenticate } from '../../middleware/openIdConnect';
import { requireAuth } from '../../middleware/authorization';

const router = Router();

// Public endpoint - proxies token requests to Keycloak
router.post('/token', authController.proxyOAuthToken);

// Protected endpoint - returns current user info
router.get('/me', authenticate, requireAuth, authController.getCurrentUser);

// Health check for OIDC connectivity
router.get('/health', authController.healthCheck);

export default router;
