import { Request, Response } from 'express';
import prisma from '../../lib/prisma';

const VALID_STATUSES = ['green', 'yellow', 'red'] as const;
const VALID_TAGS = ['OK', 'CAPACITY', 'CLIENT_PROCESS', 'MAINTENANCE'] as const;

export const cloudMonitorController = {
  getAll: async (_req: Request, res: Response): Promise<void> => {
    try {
      const rows = await prisma.cloudResourceStatus.findMany({
        orderBy: [{ baseName: 'asc' }, { networkName: 'asc' }, { clusterName: 'asc' }, { service: 'asc' }],
      });

      const tree: Record<string, { networks: Record<string, { clusters: Record<string, Record<string, {
        id: number; status: string; reason: string; tag: string; updatedAt: Date; updatedBy: string | null;
      }>> }> }> = {};

      for (const row of rows) {
        if (!tree[row.baseName]) tree[row.baseName] = { networks: {} };
        const site = tree[row.baseName];
        if (!site.networks[row.networkName]) site.networks[row.networkName] = { clusters: {} };
        const net = site.networks[row.networkName];
        if (!net.clusters[row.clusterName]) net.clusters[row.clusterName] = {};
        net.clusters[row.clusterName][row.service] = {
          id: row.id,
          status: row.status,
          reason: row.reason,
          tag: row.tag,
          updatedAt: row.updatedAt,
          updatedBy: row.updatedBy,
        };
      }

      res.json(tree);
    } catch (error) {
      console.error('cloudMonitorController.getAll error:', error);
      res.status(500).json({ error: 'Failed to fetch cloud monitor data' });
    }
  },

  update: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({ error: 'Invalid id' });
        return;
      }

      const { status, reason, tag } = req.body as { status: string; reason: string; tag: string };

      if (!VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
        res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
        return;
      }
      if (!VALID_TAGS.includes(tag as typeof VALID_TAGS[number])) {
        res.status(400).json({ error: `tag must be one of: ${VALID_TAGS.join(', ')}` });
        return;
      }
      if (typeof reason !== 'string') {
        res.status(400).json({ error: 'reason must be a string' });
        return;
      }

      const updatedBy = req.auth!.user.username;
      const updated = await prisma.cloudResourceStatus.update({
        where: { id },
        data: { status, reason: reason.trim(), tag, updatedBy },
      });

      res.json(updated);
    } catch (error: any) {
      if (error?.code === 'P2025') {
        res.status(404).json({ error: 'Record not found' });
        return;
      }
      console.error('cloudMonitorController.update error:', error);
      res.status(500).json({ error: 'Failed to update cloud monitor status' });
    }
  },

  getAllFlat: async (_req: Request, res: Response): Promise<void> => {
    try {
      const rows = await prisma.cloudResourceStatus.findMany({
        orderBy: [{ baseName: 'asc' }, { networkName: 'asc' }, { clusterName: 'asc' }, { service: 'asc' }],
      });
      res.json(rows);
    } catch (error) {
      console.error('cloudMonitorController.getAllFlat error:', error);
      res.status(500).json({ error: 'Failed to fetch cloud monitor statuses' });
    }
  },

  create: async (req: Request, res: Response): Promise<void> => {
    try {
      const { baseName, networkName, clusterName, service, status, reason, tag } = req.body;

      if (!baseName || !networkName || !clusterName || !service) {
        res.status(400).json({ error: 'baseName, networkName, clusterName, and service are required' });
        return;
      }

      if (!VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
        res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
        return;
      }
      if (!VALID_TAGS.includes(tag as typeof VALID_TAGS[number])) {
        res.status(400).json({ error: `tag must be one of: ${VALID_TAGS.join(', ')}` });
        return;
      }
      if (typeof reason !== 'string') {
        res.status(400).json({ error: 'reason must be a string' });
        return;
      }

      const created = await prisma.cloudResourceStatus.create({
        data: {
          baseName,
          networkName,
          clusterName,
          service,
          status,
          reason: reason.trim(),
          tag,
          updatedBy: req.auth!.user.username,
        },
      });

      res.status(201).json(created);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        res.status(409).json({ error: 'Record with this base/network/cluster/service already exists' });
        return;
      }
      if (error?.code === 'P2003') {
        res.status(400).json({ error: 'Invalid base, network, or cluster reference' });
        return;
      }
      console.error('cloudMonitorController.create error:', error);
      res.status(500).json({ error: 'Failed to create cloud monitor status' });
    }
  },

  delete: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({ error: 'Invalid id' });
        return;
      }

      await prisma.cloudResourceStatus.delete({ where: { id } });
      res.status(204).send();
    } catch (error: any) {
      if (error?.code === 'P2025') {
        res.status(404).json({ error: 'Record not found' });
        return;
      }
      console.error('cloudMonitorController.delete error:', error);
      res.status(500).json({ error: 'Failed to delete cloud monitor status' });
    }
  },
};
