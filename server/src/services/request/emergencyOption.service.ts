import prisma from "../../lib/prisma";

export const emergencyOptionService = {
    findAll: async () => {
        return prisma.emergencyOption.findMany();
    },

    findByName: async (name: string) => {
        return prisma.emergencyOption.findUnique({
            where: { name },
        });
    },

    create: async (data: { name: string }) => {
        return prisma.emergencyOption.create({
            data,
        });
    },

    update: async (name: string, data: { name: string }) => {
        return prisma.emergencyOption.update({
            where: { name },
            data,
        });
    },

    delete: async (name: string) => {
        return prisma.emergencyOption.delete({
            where: { name },
        });
    },
};
