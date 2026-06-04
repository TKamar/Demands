import { settings } from '../settings';
import { KeycloakAuthClient } from './keycloak';
import { CustomAuthClient } from './custom';
import { AuthClient } from './types';

export function createAuthClient(): AuthClient | null {
  const clientType = settings.authClientType.toLowerCase();

  if (clientType === 'keycloak') {
    if (
      !settings.keycloakUrl ||
      !settings.keycloakRealm ||
      !settings.keycloakClientId ||
      !settings.keycloakClientSecret
    ) {
      console.warn('Keycloak auth client not fully configured');
      return null;
    }
    return new KeycloakAuthClient(
      settings.keycloakUrl,
      settings.keycloakRealm,
      settings.keycloakClientId,
      settings.keycloakClientSecret
    );
  }

  if (clientType === 'custom') {
    if (!settings.customAuthClientUrl) {
      console.warn('Custom auth client not configured');
      return null;
    }
    return new CustomAuthClient(
      settings.customAuthClientUrl,
      settings.customAuthClientApiKey
    );
  }

  console.warn(`Unknown auth client type: ${clientType}`);
  return null;
}

export * from './types';
export * from './exceptions';
