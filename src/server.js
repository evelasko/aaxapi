import { GraphQLServer, PubSub } from 'graphql-yoga'
import express from 'express'
import session from 'express-session'
if (process.env.REDIS_URL) {
  console.log('Init Redis for Session Storage')
  const RedisStore = require('connect-redis')(session)
  const store = new RedisStore({ url: process.env.REDIS_URL })
}
else {
  console.log('Init MemoryStore for Session Storage')
  const MemoryStore = require('memorystore')(session)
  const store = new MemoryStore({ checkPeriod: 86400000 }) // prune expired entries every 24h
}

import { typeDefs, resolvers, fragmentReplacements } from './schema'
import prisma from './prisma'
import initScheduleJob from './utils/scheduler'
import { middlewareShield } from './middleware/shield'

initScheduleJob()

const pubsub = new PubSub()

const server = new GraphQLServer({
    typeDefs,
    resolvers,
    // middlewares: middlewareShield,
    context:({request, response}) => ({
        store,
        pubsub,
        prisma,
        request,
        response,
        session: request ? request.session : undefined,
        url: request ? request.protocol + "://" + request.get("host") : ""
    }),
    fragmentReplacements
})

server.express.use(session(
  {
    name: "qid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 900000
    }
  })
)
server.express.use('/images', express.static('images'))

export { server as default }
