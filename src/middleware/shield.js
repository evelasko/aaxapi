import { rule, shield, and, or, not } from 'graphql-shield'

const isAuthenticated = rule()( (parent, args, context, info) => {
    return !!context.session.userId
})

export const middlewareShield = shield({
    Mutation: {
        createNews: isAuthenticated,
        deleteNews: isAuthenticated
    }
})