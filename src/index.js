// import '@babel/polyfill/noConflict';
import { initFullCache } from './cache';
import server from './server';
import initScheduleJob from './utils/scheduler';

const port = parseInt(process.env.PORT, 10) || 4000
const options = {
  port,
  cors: {
    origin: [
      'http://localhost:3000', 'http://localhost:3001', 
      'http://localhost', 
      'http://localhost:4000', 
      'https://aaxadmin.netlify.com', 
      'https://admin.alicialonso.org'],
    credentials: true,
    optionsSuccessStatus: 200
  } // some legacy browsers (IE11, various SmartTVs) choke on 204
}


initFullCache().then(res => {
  initScheduleJob() // init scheduler for outdated nodes
  
})
server.start(options, () => { console.log('Server up and running at port: ', port || 4000) })