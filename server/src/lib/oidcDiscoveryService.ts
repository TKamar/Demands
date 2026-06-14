import axios from 'axios';
import NodeCache from 'node-cache';

interface OIDCDiscoveryDocument {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  jwks_uri: string;
  id_token_signing_alg_values_supported: string[];
}

export class OIDCDiscoveryError extends Error {
  constructor(message: string, public originalError?: unknown) {
    super(message);
    this.name = 'OIDCDiscoveryError';
  }
}

export class OIDCDiscoveryService {
  private cache: NodeCache;

  constructor(
    public readonly oidcUrl: string,
    ttlSeconds = 3600
  ) {
    this.cache = new NodeCache({ stdTTL: ttlSeconds, checkperiod: ttlSeconds });
  }

  private async fetchDiscoveryDocument(): Promise<OIDCDiscoveryDocument> {
    try {
      const response = await axios.get<OIDCDiscoveryDocument>(this.oidcUrl, {
        timeout: 30_000,
        headers: {
          Accept: 'application/json',
        },
      });

      const doc = response.data;
      const required = ['issuer', 'jwks_uri', 'token_endpoint'];
      const missing = required.filter((f) => !(f in doc));

      if (missing.length) {
        throw new OIDCDiscoveryError(
          `Missing required fields: ${missing.join(', ')}`
        );
      }

      // Rewrite localhost to keycloak for jwks_uri and token_endpoint (for Docker network access)
      // Keep issuer as-is (it's what the token contains)
      if (doc.jwks_uri?.includes('localhost:8080')) {
        doc.jwks_uri = doc.jwks_uri.replace('localhost:8080', 'keycloak:8080');
      }
      if (doc.token_endpoint?.includes('localhost:8080')) {
        doc.token_endpoint = doc.token_endpoint.replace('localhost:8080', 'keycloak:8080');
      }

      return doc;
    } catch (err) {
      if (err instanceof OIDCDiscoveryError) {
        throw err;
      }
      throw new OIDCDiscoveryError(
        'Failed to fetch OIDC discovery document',
        err
      );
    }
  }

  async getDiscoveryDocument(forceRefresh = false): Promise<OIDCDiscoveryDocument> {
    if (forceRefresh) {
      this.cache.del('document');
    }

    let doc = this.cache.get<OIDCDiscoveryDocument>('document');
    if (!doc) {
      doc = await this.fetchDiscoveryDocument();
      this.cache.set('document', doc);
    }
    return doc;
  }

  async getIssuer(): Promise<string> {
    return (await this.getDiscoveryDocument()).issuer;
  }

  async getJwksUri(): Promise<string> {
    return (await this.getDiscoveryDocument()).jwks_uri;
  }

  async getTokenEndpoint(): Promise<string> {
    return (await this.getDiscoveryDocument()).token_endpoint;
  }

  async getSupportedAlgorithms(): Promise<string[]> {
    const algs = (await this.getDiscoveryDocument())
      .id_token_signing_alg_values_supported;

    if (!algs?.length) {
      throw new OIDCDiscoveryError('No supported signing algorithms found');
    }
    return algs;
  }

  async healthCheck(): Promise<{ status: string; error?: string }> {
    try {
      await this.getDiscoveryDocument(true);
      return { status: 'healthy' };
    } catch (e) {
      return {
        status: 'unhealthy',
        error: e instanceof Error ? e.message : 'Unknown error',
      };
    }
  }
}
