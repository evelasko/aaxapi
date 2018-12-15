const schedule = require('node-schedule')
const moment = require('moment')
console.log(`> ${moment().add(30, 's').format()}`)
job = schedule.scheduleJob("123abc", moment().add(30, 's').format(), () => {console.log('runned!!')})

d = job.nextInvocation()
console.log(`>> ${moment(job.nextInvocation()).local().format()}`)
console.log(job.pendingInvocations())
