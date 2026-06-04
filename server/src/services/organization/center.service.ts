import prisma from "../../lib/prisma";

export const centerService = {
  findAll: async () => {
    return prisma.center.findMany();
  },

  findByName: async (name: string) => {
    return prisma.center.findUnique({
      where: { name },
    });
  },

  create: async (name: string, displayName?: string) => {
    return prisma.center.create({
      data: { name, displayName },
    });
  },

  update: async (name: string, data: { name?: string; displayName?: string; isActive?: boolean }) => {
    return prisma.center.update({
      where: { name },
      data,
    });
  },

  delete: async (name: string) => {
    return prisma.center.delete({
      where: { name },
    });
  },
};
