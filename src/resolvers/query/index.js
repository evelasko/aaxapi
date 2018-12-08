import userQueries from './user'
import newsQueries from './news'

const Query = {
    ...userQueries,
    ...newsQueries
}

export { Query as default }