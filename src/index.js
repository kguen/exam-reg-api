import cookieParser from 'cookie-parser'
import jwt from 'jsonwebtoken'
import {GraphQLServer} from 'graphql-yoga'
import cors from 'cors'
import prisma from './prisma'
import {uploadRouter} from './routes'

import {AuthenticationDirective, AuthorizationDirective} from './directives'
import {resolvers, fragmentReplacements} from './resolvers/index'

require('dotenv').config({path: '.env'})

const server = new GraphQLServer({
    typeDefs: './src/schema.graphql',
    resolvers,
    resolverValidationOptions: {
        requireResolversForResolveType: false,
    },
    schemaDirectives: {
        authenticated: AuthenticationDirective,
        authorized: AuthorizationDirective,
    },
    context: ({request, response}) => {
        return {req: request, res: response, user: request.user, prisma}
    },
    fragmentReplacements,
})

const opts = {
    port: 4000,
    cors: {
        credentials: true,
        origin: ['http://localhost:3000', 'https://postwoman.io'], // frontend url.
    },
}
server.express.use(cors(opts.cors))

server.express.use(cookieParser())

server.express.use((req, res, next) => {
    try {
        const token = req?.cookies?.token || req.headers?.authorization?.replace('Bearer ', '')
        if (token) {
            const {userID} = jwt.verify(token, process.env.APP_SECRET)
            req.userID = userID
        }
        next()
    } catch (error) {
        console.log('Error: ', error.message)
    }
})

server.express.use(async (req, res, next) => {
    // if they aren't logged in, skip this
    if (!req.userID) return next()

    const user = await prisma.query.user(
        {
            where: {id: req.userID},
        },
        '{ id userType }'
    )
    req.user = user
    next()
})

server.express.use('/upload', uploadRouter)

server.start(opts, () => {
    console.log(`Server is running on http://localhost:${opts.port}`)
})
