import { OIDCDiscoveryService } from './oidcDiscoveryService';
import { createAuthClient } from './authClient';
import { settings } from './settings';

export const oidcDiscoveryService = new OIDCDiscoveryService(settings.oidcDiscoveryUrl);
export const authClient = createAuthClient();
