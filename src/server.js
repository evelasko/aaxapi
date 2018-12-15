import { GraphQLServer, PubSub } from 'graphql-yoga'
import path from 'path'
//const express = require('express')
import express from 'express'
import { typeDefs, resolvers, fragmentReplacements } from './schema'
import prisma from './prisma'
import initScheduleJob from './utils/scheduler'

initScheduleJob()

const pubsub = new PubSub()

const server = new GraphQLServer({
    typeDefs,
    resolvers,
    context(request) {
        return { pubsub, prisma, request }
    },
    fragmentReplacements
})

server.express.use('/app', express.static(path.join(__dirname, 'public')))
server.express.get('/hi', (req, res) => {
  res.send('Hello World!');
});
export { server as default }
