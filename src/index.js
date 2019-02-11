import '@babel/polyfill/noConflict'
import { ApolloEngine } from 'apollo-engine'
import server from './server'

const port = parseInt(process.env.PORT, 10) || 4000
const options = {
  port,
  cors: {
    origin: ['http://localhost:3000', 'http://localhost', 'http://localhost:4000', 'https://aaxadmin.netlify.com', 'https://admin.alicialonso.org'],
    credentials: true,
    optionsSuccessStatus: 200
  } // some legacy browsers (IE11, various SmartTVs) choke on 204
}

// Apollo Engine
if (process.env.ENGINE_API_KEY) {
  const engine = new ApolloEngine({ apiKey: process.env.ENGINE_API_KEY })
  const httpServer = server.createHttpServer({ tracing: true, cacheControl: true })

  engine.listen(
    { port, httpServer, graphqlPaths: ['/'] },
    () => console.log(`Server with Apollo Engine is running on http://localhost:${port}`)
  )
}
else {
  server.start(
    { port, options}, () => console.log(`Server running on http://localhost:${port}`), )
}

// server.start(options, () => { console.log('Server up and running at port: ', process.env.PORT || 4000) })
