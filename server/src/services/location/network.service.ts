import prisma from "../../lib/prisma";

export const networkService = {
  findAll: async () => {
    return prisma.network.findMany();
  },

  findByName: async (name: string) => {
    return prisma.network.findUnique({
      where: { name },
    });
  },

  create: async (name: string, displayName?: string) => {
    return prisma.network.create({
      data: { name, displayName },
    });
  },

  update: async (name: string, data: { name?: string; displayName?: string; isActive?: boolean }) => {
    return prisma.network.update({
      where: { name },
      data,
    });
  },

  delete: async (name: string) => {
    return prisma.network.delete({
      where: { name },
    });
  },
};
