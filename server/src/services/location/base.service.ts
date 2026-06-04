import prisma from "../../lib/prisma";

export const baseService = {
  findAll: async () => {
    return prisma.base.findMany();
  },

  findByName: async (name: string) => {
    return prisma.base.findUnique({
      where: { name },
    });
  },

  create: async (name: string, displayName?: string) => {
    return prisma.base.create({
      data: { name, displayName },
    });
  },

  update: async (name: string, data: { name?: string; displayName?: string; isActive?: boolean }) => {
    return prisma.base.update({
      where: { name },
      data,
    });
  },

  delete: async (name: string) => {
    return prisma.base.delete({
      where: { name },
    });
  },
};
