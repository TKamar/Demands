import { Request, Response } from 'express';
import axios from 'axios';
import { oidcDiscoveryService, authClient } from '../../lib/services';

export const authController = {
  /**
   * Proxy OAuth token requests to Keycloak
   * This avoids CORS issues when the frontend authenticates
   */
  proxyOAuthToken: async (req: Request, res: Response) => {
    try {
      const tokenEndpoint = await oidcDiscoveryService.getTokenEndpoint();

      const response = await axios.post(
        tokenEndpoint,
        new URLSearchParams(req.body).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
          timeout: 30_000,
        }
      );

      res.json(response.data);
    } catch (error) {
      console.error('authController.proxyOAuthToken error:', error);

      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          return res.status(408).json({ error: 'Request timed out' });
        }

        if (error.response) {
          return res.status(error.response.status).json(error.response.data);
        }
      }

      res.status(502).json({ error: 'Failed to obtain token' });
    }
  },

  /**
   * Get current authenticated user info
   */
  getCurrentUser: async (req: Request, res: Response) => {
    try {
      if (!req.auth) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { user } = req.auth;

      res.json({
        sub: user.sub,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        roles: user.oidcRoles,
      });
    } catch (error) {
      console.error('authController.getCurrentUser error:', error);
      res.status(500).json({ error: 'Failed to get user info' });
    }
  },

  /**
   * Health check for OIDC and auth client connectivity
   */
  healthCheck: async (_req: Request, res: Response) => {
    try {
      const oidcHealth = await oidcDiscoveryService.healthCheck();
      const authClientHealth = authClient
        ? await authClient.healthCheck()
        : { status: 'not_configured' };

      const isHealthy =
        oidcHealth.status === 'healthy' &&
        (authClientHealth.status === 'healthy' ||
          authClientHealth.status === 'not_configured');

      const statusCode = isHealthy ? 200 : 503;

      res.status(statusCode).json({
        status: isHealthy ? 'ok' : 'degraded',
        oidc: oidcHealth.status,
        authClient: authClientHealth.status,
        ...(oidcHealth.error && { oidcError: oidcHealth.error }),
        ...(authClientHealth.error && { authClientError: authClientHealth.error }),
      });
    } catch (error) {
      console.error('authController.healthCheck error:', error);
      res.status(503).json({ status: 'error' });
    }
  },
};
