import connectRedis from 'connect-redis';
import express from 'express';
import session from 'express-session';
import { GraphQLServer, PubSub } from 'graphql-yoga';
import proxy from 'http-proxy-middleware';
import Redis from 'ioredis';
import { redisSessionPrefix } from './constants';
import prisma from './prisma';
import { fragmentReplacements, resolvers, typeDefs } from './schema';
import paymentRoutes from './utils/payments'

export const redis = new Redis(process.env.REDIS_URL)
const pubsub = new PubSub()
// const options = {
//   retry_strategy: options => {
//     // reconnect after
//     return Math.max(options.attempt * 100, 3000);
//   }
// }
// const pubsub = new RedisPubSub({
//   publisher: new Redis(),
//   subscriber: new Redis()
// })

const server = new GraphQLServer({
    typeDefs,
    resolvers,
    // middlewares: middlewareShield,
    context:({request, response}) => ({
        redis,
        // pubsub,
        prisma,
        request,
        response,
        session: request ? request.session : undefined,
        url: request ? request.protocol + "://" + request.get("host") : ""
    }),
    fragmentReplacements
})

server.express.enable('trust proxy')
const RedisStore = connectRedis(session)
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
      maxAge: 7200000
    }
  })
)
server.express.use('/images', express.static('images'))
server.express.use('/resources', express.static('resources'))
server.express.use('/mobile', proxy({ 
                                target: process.env.HOST, 
                                changeOrigin: true,
                                pathRewrite: { '/mobile' : '' }
                              }))

server.express.use('/payment', paymentRoutes)


export { server as default };

