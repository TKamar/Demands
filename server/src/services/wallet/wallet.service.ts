import prisma from "../../lib/prisma";

const walletInclude = {
  center: true,
  capacity: {
    include: {
      location: {
        include: {
          base: true,
          environment: true,
          network: true,
        },
      },
      resource: {
        include: {
          service: true,
        },
      },
    },
  },
};

export const walletService = {
  findAll: async () => {
    return prisma.wallet.findMany({
      include: walletInclude,
    });
  },

  findByServices: async (serviceNames: string[]) => {
    return prisma.wallet.findMany({
      where: {
        capacity: {
          resourceService: { in: serviceNames },
        },
      },
      include: walletInclude,
    });
  },

  findById: async (id: number) => {
    return prisma.wallet.findUnique({
      where: { id },
      include: walletInclude,
    });
  },

  findByFilters: async (filters: {
    centerName?: string;
    baseName?: string;
    environmentName?: string;
    networkName?: string;
    resourceName?: string;
    resourceService?: string;
  }) => {
    return prisma.wallet.findMany({
      where: {
        centerName: filters.centerName,
        capacity: {
          location: {
            baseName: filters.baseName,
            environmentName: filters.environmentName,
            networkName: filters.networkName,
          },
          resourceName: filters.resourceName,
          resourceService: filters.resourceService,
        },
      },
      include: walletInclude,
    });
  },

  create: async (centerName: string, capacityId: number, value: number) => {
    return prisma.wallet.create({
      data: { centerName, capacityId, value },
      include: walletInclude,
    });
  },

  update: async (id: number, data: { centerName?: string; capacityId?: number; value?: number }) => {
    return prisma.wallet.update({
      where: { id },
      data,
      include: walletInclude,
    });
  },

  delete: async (id: number) => {
    return prisma.wallet.delete({
      where: { id },
    });
  },
};
