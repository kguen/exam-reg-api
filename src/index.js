import {GraphQLServer} from 'graphql-yoga'
import cookieParser from 'cookie-parser'
import jwt from 'jsonwebtoken'
import prisma from './prisma'
import Query from './resolvers/Query'
import Mutation from './resolvers/Mutation'
import {AuthenticationDirective, AuthorizationDirective} from './directives'

require('dotenv').config()

const server = new GraphQLServer({
    typeDefs: './src/schema.graphql',
    resolvers: {Query, Mutation},
    schemaDirectives: {
        authenticated: AuthenticationDirective,
        authorized: AuthorizationDirective,
    },
    context: ({request, response}) => {
        return {req: request, res: response, user: request.user, prisma}
    },
})

server.express.use((req, res, next) => {
    const token =
        (req.cookies && req.cookies.token) ||
        (req.headers.authorization && req.headers.authorization.replace('Bearer', ''))

    if (token) {
        const {userID} = jwt.verify(token, process.env.APP_SECRET)
        req.userID = userID
    }
    next()
})

server.express.use(async (req, res, next) => {
    // if they aren't logged in, skip this
    if (!req.userID) return next()
    const user = await prisma.query.user(
        {where: {id: req.userID}},
        '{ id, userType, email, name, student {studentID} }'
    )
    // console.log(user)
    req.user = user
    next()
})

server.express.use(cookieParser())
const opts = {
    port: 4000,
    cors: 'http://localhost:3000/',
}

server.start(opts, () => {
    console.log(`Server is running on http://localhost:${opts.port}`)
})
