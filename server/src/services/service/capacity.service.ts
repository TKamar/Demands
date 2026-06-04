import prisma from "../../lib/prisma";

export const capacityService = {
  findAll: async () => {
    return prisma.capacity.findMany({
      include: { location: true, resource: true },
    });
  },

  findByServices: async (serviceNames: string[]) => {
    return prisma.capacity.findMany({
      where: {
        resourceService: { in: serviceNames },
      },
      include: { location: true, resource: true },
    });
  },

  getModeratorServices: async (username: string): Promise<string[]> => {
    const services = await prisma.service.findMany({
      where: {
        moderators: { has: username },
      },
      select: { name: true },
    });
    return services.map(s => s.name);
  },

  findById: async (id: number) => {
    return prisma.capacity.findUnique({
      where: { id },
      include: { location: true, resource: true },
    });
  },

  findByLocation: async (locationId: number) => {
    return prisma.capacity.findMany({
      where: { locationId },
      include: { location: true, resource: true },
    });
  },

  findByResource: async (resourceName: string, resourceService: string) => {
    return prisma.capacity.findMany({
      where: { resourceName, resourceService },
      include: { location: true, resource: true },
    });
  },

  create: async (
    locationId: number,
    resourceName: string,
    resourceService: string,
    value: number
  ) => {
    return prisma.capacity.create({
      data: { locationId, resourceName, resourceService, value },
      include: { location: true, resource: true },
    });
  },

  update: async (id: number, value: number) => {
    return prisma.capacity.update({
      where: { id },
      data: { value },
      include: { location: true, resource: true },
    });
  },

  delete: async (id: number) => {
    return prisma.capacity.delete({
      where: { id },
    });
  },
};
