import { authClient } from '../../lib/services';
import { AuthClientConfigurationError } from '../../lib/authClient';

export const usersGroupsService = {
  async searchUsersAndGroups(search: string) {
    if (!authClient) {
      throw new AuthClientConfigurationError('Auth client not configured');
    }

    const [users, groups] = await Promise.all([
      authClient.searchUsers(search),
      authClient.searchGroups(search),
    ]);

    return { users, groups };
  },
};
