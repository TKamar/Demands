import { AuthClient } from './types';
import { AuthClientConfigurationError } from './exceptions';

export class CustomAuthClient implements AuthClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey?: string
  ) {}

  async getUserGroups(_userId: string): Promise<string[]> {
    throw new AuthClientConfigurationError(
      'Custom auth client is not yet implemented. Please implement the getUserGroups method for your auth service.'
    );
  }

  async healthCheck(): Promise<{ status: string; error?: string }> {
    return {
      status: 'unhealthy',
      error: 'Custom auth client is not yet implemented',
    };
  }

  async searchUsers(_search: string): Promise<Array<{ id: string; name: string }>> {
    throw new AuthClientConfigurationError(
      'Custom auth client is not yet implemented. Please implement the searchUsers method for your auth service.'
    );
  }

  async searchGroups(_search: string): Promise<Array<{ id: string; name: string }>> {
    throw new AuthClientConfigurationError(
      'Custom auth client is not yet implemented. Please implement the searchGroups method for your auth service.'
    );
  }
}
