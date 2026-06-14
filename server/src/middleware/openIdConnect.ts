import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { oidcDiscoveryService } from '../lib/services';
import { settings } from '../lib/settings';
import { TokenInfo, tokenInfoFromClaims } from '../models/auth/token.model';

// Augment Express Request type
declare global {
  namespace Express {
    interface Request {
      auth?: TokenInfo;
    }
  }
}

// JWKS client (lazy initialized)
let jwksClientInstance: jwksClient.JwksClient | null = null;

async function getJwksClient(): Promise<jwksClient.JwksClient> {
  if (!jwksClientInstance) {
    const jwksUri = await oidcDiscoveryService.getJwksUri();
    jwksClientInstance = jwksClient({
      jwksUri,
      cache: true,
      cacheMaxAge: 600000, // 10 minutes
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });
  }
  return jwksClientInstance;
}

function getSigningKey(header: jwt.JwtHeader): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const client = await getJwksClient();
      client.getSigningKey(header.kid, (err, key) => {
        if (err) {
          reject(err);
          return;
        }
        if (!key) {
          reject(new Error('No signing key found'));
          return;
        }
        const signingKey = key.getPublicKey();
        resolve(signingKey);
      });
    } catch (error) {
      reject(error);
    }
  });
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    // No token - continue without auth (let authorization middleware handle it)
    next();
    return;
  }

  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Invalid authorization header format' });
    return;
  }

  const token = authHeader.substring(7);

  try {
    // Decode header to get key ID
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === 'string') {
      res.status(401).json({ error: 'Invalid token format' });
      return;
    }

    // Get signing key and verify
    const signingKey = await getSigningKey(decoded.header);
    const discoveredIssuer = await oidcDiscoveryService.getIssuer();
    const issuer = discoveredIssuer; // Use discovered issuer from Keycloak (rewritten by oidcDiscoveryService)
    const algorithms = await oidcDiscoveryService.getSupportedAlgorithms();

    const verified = jwt.verify(token, signingKey, {
      issuer,
      audience: settings.authAudience,
      algorithms: algorithms as jwt.Algorithm[],
    }) as Record<string, unknown>;

    // Build TokenInfo and attach to request
    req.auth = tokenInfoFromClaims(token, verified);

    next();
  } catch (error) {
    console.error('Authentication error:', error);

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    res.status(401).json({ error: 'Authentication failed' });
  }
}
