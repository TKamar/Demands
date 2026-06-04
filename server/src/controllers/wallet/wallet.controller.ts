import { Request, Response } from "express";
import { walletService } from "../../services/wallet/wallet.service";
import { settings } from "../../lib/settings";

export const walletController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const user = req.auth?.user;

      // Admins get all wallets
      if (user?.hasRole(settings.authAdminGroup)) {
        const wallets = await walletService.findAll();
        return res.json(wallets);
      }

      // Moderators get only wallets for services they moderate
      if (user?.hasRole(settings.authModeratorGroup) && user.username) {
        // Need to import capacityService or move getModeratorServices to a shared service
        // Assuming capacityService is available or imported
        const { capacityService } = await import("../../services/service/capacity.service");
        const moderatorServices = await capacityService.getModeratorServices(user.username);
        const wallets = await walletService.findByServices(moderatorServices);
        return res.json(wallets);
      }

      // Other authenticated users see all (read-only) or restricted? 
      // Assuming same as capacity - see all read-only
      const wallets = await walletService.findAll();
      res.json(wallets);
    } catch (error) {
      console.error("walletController.getAll error:", error);
      res.status(500).json({ error: "Failed to fetch wallets" });
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const wallet = await walletService.findById(Number(req.params.id));
      if (!wallet) {
        return res.status(404).json({ error: "Wallet not found" });
      }
      res.json(wallet);
    } catch (error) {
      console.error("walletController.getById error:", error);
      res.status(500).json({ error: "Failed to fetch wallet" });
    }
  },

  getByFilters: async (req: Request, res: Response) => {
    try {
      const { centerName, baseName, environmentName, networkName, resourceName, resourceService } = req.query;
      const wallets = await walletService.findByFilters({
        centerName: centerName as string | undefined,
        baseName: baseName as string | undefined,
        environmentName: environmentName as string | undefined,
        networkName: networkName as string | undefined,
        resourceName: resourceName as string | undefined,
        resourceService: resourceService as string | undefined,
      });
      res.json(wallets);
    } catch (error) {
      console.error("walletController.getByFilters error:", error);
      res.status(500).json({ error: "Failed to fetch wallets" });
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const { centerName, capacityId, value } = req.body;
      const user = req.auth?.user;

      // Permission check
      if (!user?.hasRole(settings.authAdminGroup)) {
        if (!user || !user.username) return res.status(401).json({ error: "Unauthorized" });

        // Check capacity to see if user moderates its service
        const { capacityService } = await import("../../services/service/capacity.service");
        const capacity = await capacityService.findById(capacityId);
        if (!capacity) return res.status(404).json({ error: "Capacity not found" });

        const moderatorServices = await capacityService.getModeratorServices(user.username);
        if (!moderatorServices.includes(capacity.resourceService)) {
          return res.status(403).json({ error: `You are not a moderator for service: ${capacity.resourceService}` });
        }
      }

      const wallet = await walletService.create(centerName, capacityId, value);
      res.status(201).json(wallet);
    } catch (error) {
      console.error("walletController.create error:", error);
      res.status(400).json({ error: "Failed to create wallet" });
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const { centerName, capacityId, value } = req.body;
      const id = Number(req.params.id);
      const user = req.auth?.user;

      // Permission check
      if (!user?.hasRole(settings.authAdminGroup)) {
        if (!user || !user.username) return res.status(401).json({ error: "Unauthorized" });

        const existingWallet = await walletService.findById(id);
        if (!existingWallet) return res.status(404).json({ error: "Wallet not found" });

        const { capacityService } = await import("../../services/service/capacity.service");
        // Check permissions based on the *existing* wallet's capacity logic
        // But walletService findById includes capacity, so we can check directly
        // However, standard wallet logic might be tricky. Let's check existingWallet's capacity service.
        // It has full includes.
        const serviceName = existingWallet.capacity.resourceService;

        const moderatorServices = await capacityService.getModeratorServices(user.username);
        if (!moderatorServices.includes(serviceName)) {
          return res.status(403).json({ error: `You are not a moderator for service: ${serviceName}` });
        }

        // If changing capacityId, should we check the new capacity too? Yes.
        if (capacityId && capacityId !== existingWallet.capacityId) {
          const newCapacity = await capacityService.findById(capacityId);
          if (!newCapacity) return res.status(404).json({ error: "New Capacity not found" });
          if (!moderatorServices.includes(newCapacity.resourceService)) {
            return res.status(403).json({ error: `You are not a moderator for new service: ${newCapacity.resourceService}` });
          }
        }
      }

      const wallet = await walletService.update(id, { centerName, capacityId, value });
      res.json(wallet);
    } catch (error) {
      console.error("walletController.update error:", error);
      res.status(400).json({ error: "Failed to update wallet" });
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const user = req.auth?.user;

      // Permission check
      if (!user?.hasRole(settings.authAdminGroup)) {
        if (!user || !user.username) return res.status(401).json({ error: "Unauthorized" });

        const existingWallet = await walletService.findById(id);
        if (!existingWallet) return res.status(404).json({ error: "Wallet not found" });

        const { capacityService } = await import("../../services/service/capacity.service");
        const serviceName = existingWallet.capacity.resourceService;
        const moderatorServices = await capacityService.getModeratorServices(user.username);
        if (!moderatorServices.includes(serviceName)) {
          return res.status(403).json({ error: `You are not a moderator for service: ${serviceName}` });
        }
      }

      await walletService.delete(id);
      res.status(204).send();
    } catch (error) {
      console.error("walletController.delete error:", error);
      res.status(400).json({ error: "Failed to delete wallet" });
    }
  },
};
