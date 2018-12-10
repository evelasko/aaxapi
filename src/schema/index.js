import { extractFragmentReplacements } from 'prisma-binding'
import _ from 'lodash'

import { typeDef as user, Resolvers as userResolvers } from './user'
import { typeDef as news, Resolvers as newsResolvers } from './news'
import { typeDef as event, Resolvers as eventResolvers } from './event'

const commonTypeDef = `
    scalar DateTime
    type Query {
        _empty: String
    }
    type Mutation {
        _empty: String
    }
    type Venue {
        id: ID!
        name: String!
        address: String!
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
    enum UserGroup {
        STAFF
        PUBLIC
        STUDENT
    }
`

export const typeDefs = [ commonTypeDef, user, news, event ]
const resolversObject = {}
export const resolvers = _.merge(resolversObject, userResolvers, newsResolvers, eventResolvers)
export const fragmentReplacements = extractFragmentReplacements(resolvers)
