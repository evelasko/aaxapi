import { GraphQLServer, PubSub } from 'graphql-yoga'
import { typeDefs, resolvers, fragmentReplacements } from './schema'
import prisma from './prisma'

const pubsub = new PubSub()

const server = new GraphQLServer({
    typeDefs,
    resolvers,
    context(request) {
        return { pubsub, prisma, request }
    },
    fragmentReplacements
})

export { server as default }
