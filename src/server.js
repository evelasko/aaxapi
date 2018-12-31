import { GraphQLServer, PubSub } from 'graphql-yoga'
import cors from 'cors'
import session from 'express-session'

import { typeDefs, resolvers, fragmentReplacements } from './schema'
import prisma from './prisma'
import initScheduleJob from './utils/scheduler'
import { middlewareShield } from './middleware/shield'

initScheduleJob()

const pubsub = new PubSub()

const server = new GraphQLServer({
    typeDefs,
    resolvers,
    middlewares: middlewareShield,
    context(request) {
        return { pubsub, prisma, request }
    },
    fragmentReplacements
})

const corsOptions = {
  origin: 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}

server.express.use(cors(corsOptions))
server.express.use(
  session({
    name: "qid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      //secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  })
)

export { server as default }
