import '@babel/polyfill/noConflict'
import server from './server'
import express from 'express'
import Mailgun from 'mailgun-js'

// import cors from 'cors'

// const corsOptions = {
//   origin: 'http://localhost:3000',
//   credentials: true,
//   optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
// }

// const serverOptions = {
//   port: process.env.PORT || 4000,
//   cors: cors(corsOptions)
// }

server.start({port: process.env.PORT || 4000}, () => { console.log('Server up and running!') })
