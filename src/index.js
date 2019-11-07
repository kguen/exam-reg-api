import { GraphQLServer } from 'graphql-yoga';
import prisma from './prisma';
import Query from './resolvers/Query';
import Mutation from './resolvers/Mutation';

const server = new GraphQLServer({
    typeDefs: './src/schema.graphql',
    resolvers: { Query, Mutation },
    context: { prisma }
});

server.start(() => {
    console.log('Server is up!');
});