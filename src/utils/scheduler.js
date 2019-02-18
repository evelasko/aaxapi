import schedule from 'node-schedule'
import moment from 'moment'
import { deleteImage } from './upload.js'
import prisma from '../prisma'
import { getEventById, getNewsById } from './queryCache'
import { cacheEvents, cacheNews } from '../cache'

const processNews = async () => {
    let newses = await getNewsById()
    newses = newses.filter(n => moment(n.expiration).isBefore() && n.published)
    if (!newses.length) return 0
    newses.forEach(async news => {
      if (news.deleteUpon) {
        await prisma.mutation.deleteNews({where: {id: news.id}}, '{id}')
                                                .catch(e => console.log(e))
        deleteImage(news.imageURL)
      }
      else await prisma.mutation.updateNews({where: { id: news.id }, data: { published: false } }, '{id}')
                                .catch(e => console.log(e))
    })
    await cacheNews()
    return newses.length
}

const processEvent = async () => {
    let events = await getEventById()
    events = events.filter(e => moment(e.date).isBefore() && e.published )
    if (!events.length) return 0
    events.forEach(async event => {
      if (event.deleteUpon) {
        await prisma.mutation.deleteEvent({ where: {id: event.id}}, '{id}')
                                                 .catch(e => console.log(e))
        deleteImage(event.imageURL)
      }
      else await prisma.mutation.updateEvent({where: { id: event.id }, data: { published: false } }, '{id}')
                                .catch(e => console.log(e))
    })
    await cacheEvents()
    return events.length
}

const scheduleJob = async () => {
  const processed = {}
  processed.news = await processNews().catch(e => console.log(e))
  processed.event = await processEvent().catch(e => console.log(e))
  return processed
}

const job = () => {
  scheduleJob()
    .then(processed => { console.log(`processed ${processed.news} news and ${processed.event} events`) })
    .catch(e => console.log(e))
}

const initScheduleJob = () => {
  job()
  var rule = new schedule.RecurrenceRule()
  rule.dayOfWeek = [0, new schedule.Range(0, 6)]
  rule.hour = [1, new schedule.Range(7, 21)]
  schedule.scheduleJob('archiverJob', '15 * * * *', () => { job() }) // rule
  // schedule.scheduleJob('test','08 * * * *', () => {
  //   console.log('@scheduleJob test on:', moment().format())
  // })
}

export { initScheduleJob as default }
