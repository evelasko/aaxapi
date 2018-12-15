import moment from 'moment'

const isBeforeNow = date => {
  if (!moment(date).isValid()) return null
    if ( !moment(date).isSameOrBefore(moment(), 'day') ) return date
}

const aWeekFromNow = date => {
    return moment.utc().add(1, 'w').format()
}

export { isBeforeNow, aWeekFromNow }
