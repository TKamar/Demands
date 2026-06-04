import prisma from "../../lib/prisma";

export const resourceService = {
  findAll: async () => {
    return prisma.resource.findMany();
  },

  findByKey: async (name: string, serviceName: string) => {
    return prisma.resource.findUnique({
      where: { name_serviceName: { name, serviceName } },
    });
  },

  findByService: async (serviceName: string) => {
    return prisma.resource.findMany({
      where: { serviceName },
    });
  },

  create: async (name: string, unit: string, serviceName: string) => {
    return prisma.resource.create({
      data: { name, unit, serviceName },
    });
  },

  update: async (
    name: string,
    serviceName: string,
    data: { name?: string; unit?: string; isActive?: boolean }
  ) => {
    return prisma.resource.update({
      where: { name_serviceName: { name, serviceName } },
      data,
    });
  },

  delete: async (name: string, serviceName: string) => {
    return prisma.resource.delete({
      where: { name_serviceName: { name, serviceName } },
    });
  },
};
