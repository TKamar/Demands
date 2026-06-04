import prisma from "../../lib/prisma";

export const environmentService = {
  findAll: async () => {
    return prisma.environment.findMany();
  },

  findByName: async (name: string) => {
    return prisma.environment.findUnique({
      where: { name },
    });
  },

  create: async (name: string, displayName?: string) => {
    return prisma.environment.create({
      data: { name, displayName },
    });
  },

  update: async (name: string, data: { name?: string; displayName?: string; isActive?: boolean }) => {
    return prisma.environment.update({
      where: { name },
      data,
    });
  },

  delete: async (name: string) => {
    return prisma.environment.delete({
      where: { name },
    });
  },
};
