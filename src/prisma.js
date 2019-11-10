import { Prisma } from 'prisma-binding';

const prisma = new Prisma({
    typeDefs: 'src/generated/prisma.graphql',
    endpoint: process.env.PRISMA_ENDPOINT
    //endpoint: 'http://localhost:4466/exam'
});

export { prisma as default };
