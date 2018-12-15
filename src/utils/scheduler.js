import schedule from 'node-schedule'
import moment from 'moment'
import prisma from '../prisma'

const processNews = async () => {
    const newses = await prisma.query.newses({where: {
                                                  published: true,
                                                  expiration_lte: moment().format()
                                                }}, '{ id title expiration deleteUpon }')
                                     .catch(e => console.log(e))
    if (!newses.length) return 0
    newses.forEach(async news => {
      if (news.deleteUpon) await prisma.mutation.deleteNews({where: {id: news.id}}, '{id}')
                                                .catch(e => console.log(e))
      else await prisma.mutation.updateNews({where: { id: news.id }, data: { published: false } }, '{id}')
                                .catch(e => console.log(e))
    })
    return newses.length
}

const processEvent = async () => {
    const events = await prisma.query.events({ where: {
                                                  published: true,
                                                  date_lte: moment().format()
                                                }}, '{ id title date deleteUpon }')
                                     .catch(e => console.log(e))
    if (!events.length) return 0
    events.forEach(async event => {
      if (event.deleteUpon) await prisma.mutation.deleteEvent({ where: {id: event.id}}, '{id}')
                                                 .catch(e => console.log(e))
      else await prisma.mutation.updateEvent({where: { id: event.id }, data: { published: false } }, '{id}')
                                .catch(e => console.log(e))
    })
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
  var rule = new schedule.RecurrenceRule()
  rule.dayOfWeek = [0, new schedule.Range(0, 6)]
  rule.hour = [1, new schedule.Range(7, 21)]
  schedule.scheduleJob('archiverJob', rule, () => { job() })
}

export { initScheduleJob as default }
