import {AuthenticationError} from 'apollo-server-core'
import {SchemaDirectiveVisitor} from 'graphql-tools/dist/schemaVisitor'
import {defaultFieldResolver, GraphQLString} from 'graphql'

// TODO change all of this

class AuthenticationDirective extends SchemaDirectiveVisitor {
    visitFieldDefinition(field) {
        const resolver = field.resolve || defaultFieldResolver

        field.resolve = async (root, args, ctx, info) => {
            if (!ctx.user) {
                throw new AuthenticationError('You must be logged in')
            }
            return resolver(root, args, ctx, info)
        }
    }
}

class AuthorizationDirective extends SchemaDirectiveVisitor {
    visitFieldDefinition(field) {
        const resolver = field.resolve || defaultFieldResolver
        const {role} = this.args
        field.resolve = async (root, args, ctx, info) => {
            if (ctx.user.userType !== role) {
                throw new AuthenticationError("You don't have permission to access this resource")
            }
            return resolver(root, args, ctx, info)
        }
    }
}

module.exports = {AuthenticationDirective, AuthorizationDirective}
