import { extractFragmentReplacements } from 'prisma-binding'
import _ from 'lodash'

import { typeDef as user, Resolvers as userResolvers } from './user'
import { typeDef as news, Resolvers as newsResolvers } from './news'
import { typeDef as event, Resolvers as eventResolvers } from './event'
import { typeDef as venue, Resolvers as venueResolvers } from './venue'

const commonTypeDef = `
    scalar DateTime
    scalar Upload

    type Query {
        _empty: String
    }
    type Mutation {
        _empty: String
    }
    type Address {
        id: ID
    }
    type PhoneNumber {
        id: ID
    }
    enum MutationType {
        CREATED
        UPDATED
        DELETED
    }
    enum NewsCategory {
        NEWS
        ALERT
        CALL
    }
    enum UserGroup {
        STAFF
        PUBLIC
        STUDENT
    }
`

export const typeDefs = [ commonTypeDef, user, news, event, venue ]
const resolversObject = {}
export const resolvers = _.merge(
    resolversObject,
    userResolvers,
    newsResolvers,
    eventResolvers,
    venueResolvers)
export const fragmentReplacements = extractFragmentReplacements(resolvers)
