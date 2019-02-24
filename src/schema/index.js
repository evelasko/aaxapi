import _ from 'lodash';
import { extractFragmentReplacements } from 'prisma-binding';
import { Resolvers as eventResolvers, typeDef as event } from './event';
import { Resolvers as newsResolvers, typeDef as news } from './news';
import { Resolvers as subsResolvers, typeDef as subscriptions } from './subscriptions';
import { Resolvers as userResolvers, typeDef as user } from './user';
import { Resolvers as venueResolvers, typeDef as venue } from './venue';


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
    enum nIdType {
      PASSPORT
      NATIONALID
      SOCIALSECURITY
      OTHER
    }
`

export const typeDefs = [ commonTypeDef, user, news, event, venue, subscriptions ]
const resolversObject = {}
export const resolvers = _.merge(
    resolversObject,
    userResolvers,
    newsResolvers,
    eventResolvers,
    venueResolvers,
    subsResolvers)
export const fragmentReplacements = extractFragmentReplacements(resolvers)
