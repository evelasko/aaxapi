import { extractFragmentReplacements } from 'prisma-binding'
import Query from './query'
import Mutation from './mutation'
import Subscription from './subscription'
import { User, News } from './types'

const resolvers = { 
    Query, 
    Mutation, 
    User, News
    //Subscription 
}

const fragmentReplacements = extractFragmentReplacements(resolvers)

export { resolvers, fragmentReplacements }
