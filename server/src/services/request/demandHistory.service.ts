import prisma from '../../lib/prisma';

export type DemandAction =
  | 'Created' | 'Approved' | 'PartiallyApproved' | 'ApprovedWithCondition'
  | 'Rejected' | 'Cancelled' | 'Restored' | 'Edited' | 'Transferred'
  | 'TransferredTo810' | 'AwaitingProcurement' | 'HeldForEfficiency'
  | 'ConditionalFootprintReduction' | 'InProgress';

export const demandHistoryService = {
  async log(
    demandId: number,
    action: DemandAction | string,
    actorUsername?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await prisma.demandHistoryLog.create({
      data: { demandId, action, actorUsername, metadata: metadata as any },
    });
  },

  async getByDemand(demandId: number) {
    return prisma.demandHistoryLog.findMany({
      where: { demandId },
      orderBy: { createdAt: 'asc' },
    });
  },
};
