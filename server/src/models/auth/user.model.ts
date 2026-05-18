import { UserRole } from '@prisma/client';

export class User {
  username: string;
  fullName: string;
  oidcRoles: string[];
  role: UserRole;
  centerName: string | null;

  // Legacy fields kept for backward compatibility with existing code
  readonly sub: string;
  readonly email?: string;
  readonly givenName?: string;
  readonly familyName?: string;

  constructor(data: {
    username: string;
    fullName: string;
    oidcRoles: string[];
    role: UserRole;
    centerName: string | null;
    // Legacy optional fields
    sub?: string;
    email?: string;
    givenName?: string;
    familyName?: string;
  }) {
    this.username = data.username;
    this.fullName = data.fullName;
    this.oidcRoles = data.oidcRoles;
    this.role = data.role;
    this.centerName = data.centerName;
    this.sub = data.sub ?? data.username;
    this.email = data.email;
    this.givenName = data.givenName;
    this.familyName = data.familyName;
  }

  get isAdmin(): boolean { return this.role === UserRole.ADMIN; }
  get isModerator(): boolean { return this.role === UserRole.MODERATOR; }
  get isCenterManager(): boolean { return this.role === UserRole.CENTER_MANAGER; }
  get isPrivileged(): boolean { return this.isAdmin || this.isModerator || this.isCenterManager; }

  canManageCenter(centerName: string): boolean {
    if (this.isAdmin) return true;
    if (this.isCenterManager) return this.centerName === centerName;
    return false;
  }

  // Legacy role helpers (used by existing middleware and controllers)
  hasRole(role: string): boolean {
    return this.oidcRoles.includes(role);
  }

  hasAnyRole(roles: string[]): boolean {
    return roles.some((role) => this.oidcRoles.includes(role));
  }

  hasAllRoles(roles: string[]): boolean {
    return roles.every((role) => this.oidcRoles.includes(role));
  }
}
