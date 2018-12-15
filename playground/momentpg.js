const moment = require('moment')

const t = 'December 13 2018 11:32:12'
const u = moment.utc(t).format()
const n = moment(u).local().format('MMMM Do YYYY HH:mm:ss')
console.log(`the string: ${t}`)
console.log(`from string to UTC: ${u}`)
console.log(`from UTC to format: ${n}`)
