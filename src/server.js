import { GraphQLServer, PubSub } from 'graphql-yoga'
import express from 'express'
import session from 'express-session'
import connectRedis from 'connect-redis'
// const RedisStore = require('connect-redis')(session)
import Redis from 'ioredis'
import { RedisPubSub } from 'graphql-redis-subscriptions'

import { typeDefs, resolvers, fragmentReplacements } from './schema'
import prisma from './prisma'
import initScheduleJob from './utils/scheduler'
import { middlewareShield } from './middleware/shield'

initScheduleJob()

const redis = new Redis(process.env.REDIS_URL)

const pubsub = new PubSub()

const server = new GraphQLServer({
    typeDefs,
    resolvers,
    // middlewares: middlewareShield,
    context:({request, response}) => ({
        pubsub,
        prisma,
        request,
        response,
        session: request ? request.session : undefined,
        url: request ? request.protocol + "://" + request.get("host") : ""
    }),
    fragmentReplacements
})

const RedisStore = connectRedis(session)
const redisSessionPrefix = "sess:"
server.express.use(session(
  {
    store: new RedisStore({ client: redis, prefix: redisSessionPrefix }),
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
