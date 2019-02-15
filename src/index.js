import '@babel/polyfill/noConflict'
// import { ApolloEngine } from 'apollo-engine'
import server from './server'
import initScheduleJob from './utils/scheduler'
import { cacheUsers, hell } from './cache'
import { getGroupRequests, getUserByEmail } from './utils/queryUsersCache'

const port = parseInt(process.env.PORT, 10) || 4000
const options = {
  port,
  cors: {
    origin: ['http://localhost:3000', 'http://localhost', 'http://localhost:4000', 'https://aaxadmin.netlify.com', 'https://admin.alicialonso.org'],
    credentials: true,
    optionsSuccessStatus: 200
  } // some legacy browsers (IE11, various SmartTVs) choke on 204
}

initScheduleJob() // init scheduler for outdated nodes

// if (process.env.ENGINE_API_KEY) {
//   const engine = new ApolloEngine({ apiKey: process.env.ENGINE_API_KEY })
//   const httpServer = server.createHttpServer({ tracing: true, cacheControl: true })
//
//   engine.listen(
//     { port, httpServer, graphqlPaths: ['/'] },
//     () => console.log(`Server with Apollo Engine is running on http://localhost:${port}`)
//   )
// }
// else {
//   server.start(
//     { port, options}, () => console.log(`Server running on http://localhost:${port}`), )
// }

cacheUsers().then(res => {
  getGroupRequests().then(res => console.log('getGroupRequests: ', res))
  getUserByEmail('h.superpotter@gmail.com').then(res => console.log('User By Email: ', res.password))
}) // update users cache at redis

server.start(options, () => { console.log('Server up and running at port: ', port || 4000) })
