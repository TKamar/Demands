import { UserRole } from '@prisma/client';
import { User } from './user.model';
import { settings } from '../../lib/settings';

export interface TokenInfo {
  rawToken: string;
  claims: Record<string, unknown>;
  user: User;
}

/**
 * Extract roles from JWT claims using dot notation path
 * @param claims - The JWT claims object
 * @param claimPath - Dot notation path to roles (e.g., "groups" or "realm_access.roles")
 */
export function extractRolesFromClaims(
  claims: Record<string, unknown>,
  claimPath: string
): string[] {
  const parts = claimPath.replace(/:/g, '.').split('.');
  let current: unknown = claims;

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return [];
    }
  }

  if (typeof current === 'string') {
    return [current];
  }

  if (Array.isArray(current)) {
    return current.filter((item): item is string => typeof item === 'string');
  }

  return [];
}

/**
 * Create TokenInfo from raw token and decoded claims.
 * Produces a User with REGULAR_USER role by default; requireAuth will
 * upsert the DB record and replace req.auth.user with the DB-backed role.
 */
export function tokenInfoFromClaims(
  rawToken: string,
  claims: Record<string, unknown>
): TokenInfo {
  const oidcRoles = extractRolesFromClaims(claims, settings.authGroupClaimPath);
  const username = (claims.preferred_username as string | undefined) ?? (claims.sub as string);
  const givenName = claims.given_name as string | undefined;
  const familyName = claims.family_name as string | undefined;
  const fullName =
    givenName && familyName
      ? `${givenName} ${familyName}`
      : givenName ?? familyName ?? username;

  const user = new User({
    username,
    fullName,
    oidcRoles,
    role: UserRole.REGULAR_USER,
    centerName: null,
    sub: claims.sub as string,
    email: claims.email as string | undefined,
    givenName,
    familyName,
  });

  return {
    rawToken,
    claims,
    user,
  };
}
