import { rule, shield, and, or, not } from 'graphql-shield'

const isAuthenticated = rule()( (parent, args, context, info) => {
    return !!context.request.session.userId
})

export const middlewareShield = shield({
  Query: {
    me: isAuthenticated
  },
    Mutation: {
        createNews: isAuthenticated,
        deleteNews: isAuthenticated
    }
})
