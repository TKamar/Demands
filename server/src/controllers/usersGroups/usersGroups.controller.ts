import { Request, Response } from 'express';
import { usersGroupsService } from '../../services/usersGroups/usersGroups.service';
import { AuthClientConfigurationError } from '../../lib/authClient';

export const usersGroupsController = {
  search: async (req: Request, res: Response) => {
    try {
      const { search } = req.query;

      if (!search || typeof search !== 'string' || search.length < 3) {
        return res
          .status(400)
          .json({ error: 'Search term must be at least 3 characters' });
      }

      const result = await usersGroupsService.searchUsersAndGroups(search);
      res.json(result);
    } catch (error) {
      if (error instanceof AuthClientConfigurationError) {
        return res.status(424).json({ error: error.message });
      }
      console.error('usersGroupsController.search error:', error);
      res.status(500).json({ error: 'Failed to search users and groups' });
    }
  },
};
