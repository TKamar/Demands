import prisma from "../../lib/prisma";
import { authClient } from "../../lib/services";
import { settings } from "../../lib/settings";

interface CreateServiceInput {
  name: string;
  moderators?: string[];
}

interface UpdateServiceInput {
  name?: string;
  moderators?: string[];
  isActive?: boolean;
}

interface ModeratorValidationResult {
  valid: string[];
  invalid: string[];
}

export const serviceService = {
  findAll: async () => {
    return prisma.service.findMany();
  },

  findByName: async (name: string) => {
    return prisma.service.findUnique({
      where: { name },
    });
  },

  create: async (input: CreateServiceInput) => {
    return prisma.service.create({
      data: {
        name: input.name,
        moderators: input.moderators ?? [],
      },
    });
  },

  update: async (name: string, input: UpdateServiceInput) => {
    return prisma.service.update({
      where: { name },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.moderators !== undefined && { moderators: input.moderators }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });
  },

  delete: async (name: string) => {
    return prisma.service.delete({
      where: { name },
    });
  },

  isUserModerator: async (serviceName: string, username: string): Promise<boolean> => {
    const service = await prisma.service.findUnique({
      where: { name: serviceName },
      select: { moderators: true },
    });
    return service?.moderators.includes(username) ?? false;
  },

  /**
   * Validates that usernames exist and have the moderator role.
   * Returns which usernames are valid moderators and which are not.
   */
  validateModerators: async (usernames: string[]): Promise<ModeratorValidationResult> => {
    if (!authClient) {
      // If no auth client configured, skip validation
      return { valid: usernames, invalid: [] };
    }

    const valid: string[] = [];
    const invalid: string[] = [];
    const moderatorGroup = settings.authModeratorGroup;

    for (const username of usernames) {
      try {
        // Search for user by username to get their Keycloak ID
        const users = await authClient.searchUsers(username);
        const user = users.find((u) => u.name === username);

        if (!user) {
          invalid.push(username);
          continue;
        }

        // Get user's groups and check for moderator role
        const groups = await authClient.getUserGroups(user.id);
        if (groups.includes(moderatorGroup)) {
          valid.push(username);
        } else {
          invalid.push(username);
        }
      } catch (error) {
        console.error(`Failed to validate moderator ${username}:`, error);
        invalid.push(username);
      }
    }

    return { valid, invalid };
  },
};
