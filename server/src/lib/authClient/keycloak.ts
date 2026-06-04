import axios from 'axios';
import NodeCache from 'node-cache';
import { AuthClient } from './types';
import {
  AuthClientAuthenticationError,
  AuthClientConnectionError,
  AuthClientUserNotFoundError,
} from './exceptions';

export class KeycloakAuthClient implements AuthClient {
  private tokenCache: NodeCache;

  constructor(
    private readonly adminUrl: string,
    private readonly realm: string,
    private readonly clientId: string,
    private readonly clientSecret: string,
    tokenTtlSeconds = 3600
  ) {
    this.tokenCache = new NodeCache({ stdTTL: tokenTtlSeconds });
  }

  private async getAdminToken(): Promise<string> {
    const cached = this.tokenCache.get<string>('token');
    if (cached) {
      return cached;
    }

    const tokenUrl = `${this.adminUrl}/realms/${this.realm}/protocol/openid-connect/token`;

    try {
      const response = await axios.post(
        tokenUrl,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 30_000,
        }
      );

      const accessToken: string = response.data.access_token;
      this.tokenCache.set('token', accessToken);
      return accessToken;
    } catch (error) {
      console.error('Failed to get Keycloak admin token:', error);
      throw new AuthClientAuthenticationError('Failed to obtain admin token');
    }
  }

  async getUserGroups(userId: string): Promise<string[]> {
    const token = await this.getAdminToken();
    const groupsUrl = `${this.adminUrl}/admin/realms/${this.realm}/users/${userId}/groups`;

    try {
      const response = await axios.get(groupsUrl, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30_000,
      });

      return response.data
        .map((group: { name?: string }) => group.name)
        .filter((name: unknown): name is string => typeof name === 'string');
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        throw new AuthClientUserNotFoundError(userId);
      }
      console.error('Failed to get user groups from Keycloak:', error);
      throw new AuthClientConnectionError(this.adminUrl, 'Failed to fetch user groups');
    }
  }

  async healthCheck(): Promise<{ status: string; error?: string }> {
    try {
      await this.getAdminToken();
      return {
        status: 'healthy',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async searchUsers(search: string): Promise<Array<{ id: string; name: string }>> {
    return this.paginatedSearch(
      `${this.adminUrl}/admin/realms/${this.realm}/users`,
      search,
      'username'
    );
  }

  async searchGroups(search: string): Promise<Array<{ id: string; name: string }>> {
    return this.paginatedSearch(
      `${this.adminUrl}/admin/realms/${this.realm}/groups`,
      search,
      'name'
    );
  }

  private async paginatedSearch(
    endpoint: string,
    search: string,
    nameField: string,
    pageSize = 100
  ): Promise<Array<{ id: string; name: string }>> {
    const token = await this.getAdminToken();
    const allResults: Array<{ id: string; name: string }> = [];
    let offset = 0;

    while (true) {
      try {
        const response = await axios.get(endpoint, {
          params: {
            search,
            first: offset,
            max: pageSize,
          },
          headers: { Authorization: `Bearer ${token}` },
          timeout: 30_000,
        });

        const items = response.data;

        if (!items || items.length === 0) {
          break;
        }

        for (const item of items) {
          allResults.push({
            id: item.id || '',
            name: item[nameField] || '',
          });
        }

        if (items.length < pageSize) {
          break;
        }

        offset += pageSize;
      } catch (error) {
        console.error('Failed to search from Keycloak:', error);
        throw new AuthClientConnectionError(this.adminUrl, 'Failed to search');
      }
    }

    return allResults;
  }
}
