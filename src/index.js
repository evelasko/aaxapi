import '@babel/polyfill/noConflict'
import server from './server'
import express from 'express'
import Mailgun from 'mailgun-js'

const options = {
  port: process.env.PORT || 4000,
  cors: {
    origin: ['http://localhost:3000', 'http://localhost'],
    credentials: true,
    optionsSuccessStatus: 200
  } // some legacy browsers (IE11, various SmartTVs) choke on 204
}

server.start(options, () => { console.log('Server up and running!') })
