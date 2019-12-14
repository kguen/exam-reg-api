import {extractFragmentReplacements} from 'prisma-binding'
import Query from './Query'
import Mutation from './Mutation'
import Student from './Student'
import User from './User'

const resolvers = {
    Query,
    Mutation,
    Student,
    User,
}
const fragmentReplacements = extractFragmentReplacements(resolvers)

export {resolvers, fragmentReplacements}
