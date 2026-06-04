import prisma from "../../lib/prisma";

export const projectKindService = {
    findAll: async () => {
        return prisma.projectKind.findMany();
    },

    findByName: async (name: string) => {
        return prisma.projectKind.findUnique({
            where: { name },
        });
    },

    create: async (data: { name: string; displayName?: string }) => {
        return prisma.projectKind.create({
            data,
        });
    },

    update: async (
        name: string,
        data: { displayName?: string }
    ) => {
        return prisma.projectKind.update({
            where: { name },
            data,
        });
    },

    delete: async (name: string) => {
        return prisma.projectKind.delete({
            where: { name },
        });
    },
};
