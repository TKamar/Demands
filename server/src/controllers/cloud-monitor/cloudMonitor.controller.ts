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
};
