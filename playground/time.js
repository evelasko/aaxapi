const moment = require('moment')

const isBeforeNow = date => {
    if ( !moment(date).isSameOrBefore(moment()) ) return date
}

console.log(isBeforeNow('2018-12-12T20:29:37.000Z') || 'hi')