import prisma from "../../lib/prisma";

export const locationService = {
  findAll: async () => {
    return prisma.location.findMany();
  },

  findById: async (id: number) => {
    return prisma.location.findUnique({
      where: { id },
    });
  },

  findByComposite: async (
    baseName: string,
    environmentName: string,
    networkName: string,
    clusterName: string
  ) => {
    return prisma.location.findUnique({
      where: {
        baseName_environmentName_networkName_clusterName: { baseName, environmentName, networkName, clusterName },
      },
    });
  },

  findByFilters: async (filters: {
    baseName?: string;
    environmentName?: string;
    networkName?: string;
    clusterName?: string;
  }) => {
    const where: {
      baseName?: string;
      environmentName?: string;
      networkName?: string;
      clusterName?: string;
    } = {};

    if (filters.baseName) where.baseName = filters.baseName;
    if (filters.environmentName) where.environmentName = filters.environmentName;
    if (filters.networkName) where.networkName = filters.networkName;
    if (filters.clusterName) where.clusterName = filters.clusterName;

    return prisma.location.findMany({ where });
  },

  create: async (
    baseName: string,
    environmentName: string,
    networkName: string,
    clusterName: string
  ) => {
    return prisma.location.create({
      data: { baseName, environmentName, networkName, clusterName },
    });
  },

  update: async (
    id: number,
    data: { baseName?: string; environmentName?: string; networkName?: string; clusterName?: string; isActive?: boolean }
  ) => {
    return prisma.location.update({
      where: { id },
      data,
    });
  },

  delete: async (id: number) => {
    return prisma.location.delete({
      where: { id },
    });
  },
};
