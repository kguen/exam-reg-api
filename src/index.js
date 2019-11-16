import {GraphQLServer} from 'graphql-yoga'
import prisma from './prisma'
import Query from './resolvers/Query'
import Mutation from './resolvers/Mutation'

const server = new GraphQLServer({
    typeDefs: './src/schema.graphql',
    resolvers: {Query, Mutation},
    context: {prisma},
})

const opts = {
    port: 4000,
    cors: '*',
}

server.start(opts, () => {
    console.log(`Server is running on http://localhost:${opts.port}`)
})
