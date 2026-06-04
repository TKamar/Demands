import prisma from "../../lib/prisma";

export const clusterService = {
  findAll: async () => {
    return prisma.cluster.findMany();
  },

  findByName: async (name: string) => {
    return prisma.cluster.findUnique({
      where: { name },
    });
  },

  create: async (name: string, displayName?: string) => {
    return prisma.cluster.create({
      data: { name, displayName },
    });
  },

  update: async (name: string, data: { name?: string; displayName?: string; isActive?: boolean }) => {
    return prisma.cluster.update({
      where: { name },
      data,
    });
  },

  delete: async (name: string) => {
    return prisma.cluster.delete({
      where: { name },
    });
  },
};
