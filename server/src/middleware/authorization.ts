import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { settings } from '../lib/settings';
import prisma from '../lib/prisma';
import { User } from '../models/auth/user.model';

/**
 * Require authenticated user.
 * Also upserts the User record in the DB so req.auth.user reflects the
 * DB-backed role and centerName.
 */
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.auth) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const { username, fullName, oidcRoles } = req.auth.user;

    const dbUser = await prisma.user.upsert({
      where: { username },
      create: { username, fullName, role: UserRole.REGULAR_USER },
      update: { fullName },
    });

    // Replace the transient token-based user with the DB-backed one
    req.auth.user = new User({
      username,
      fullName,
      oidcRoles,
      role: dbUser.role,
      centerName: dbUser.centerName,
      sub: req.auth.user.sub,
      email: req.auth.user.email,
      givenName: req.auth.user.givenName,
      familyName: req.auth.user.familyName,
    });
  } catch (err) {
    console.error('requireAuth DB upsert failed:', err);
    // Non-fatal: continue with token-based user if DB is unavailable
  }

  next();
};

/**
 * Require user to have at least one of the specified roles
 */
export const requireRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!req.auth.user.hasAnyRole(roles)) {
      res.status(403).json({
        error: 'Insufficient permissions',
        required: roles,
      });
      return;
    }

    next();
  };
};

/**
 * Require user to have all of the specified roles
 */
export const requireAllRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!req.auth.user.hasAllRoles(roles)) {
      res.status(403).json({
        error: 'Insufficient permissions',
        required: roles,
      });
      return;
    }

    next();
  };
};

/**
 * Require admin role
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.auth) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (!req.auth.user.isAdmin && !req.auth.user.hasAnyRole([settings.authAdminGroup])) {
    res.status(403).json({ message: 'Forbidden: Admin role required' });
    return;
  }

  next();
};

/**
 * Require Center Manager role (or Admin)
 */
export const requireCenterManager = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.auth) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (!req.auth.user.isCenterManager && !req.auth.user.isAdmin) {
    res.status(403).json({ message: 'Forbidden: Center Manager role required' });
    return;
  }

  next();
};
