import { PUBSUB_NEW_ALERT } from '../constants'

// ---------------------------------------------------
//      TYPE DEFS
// ---------------------------------------------------

export const typeDef = `
type Subscription {
    newAlert: News!
}
`

// ---------------------------------------------------
//      SUBSCRIPTION
// ---------------------------------------------------

export const Resolvers = {
  Subscription: {
    newAlert: {
      subscribe (_, __, {pubsub}) {
        return pubsub.asyncIterator(PUBSUB_NEW_ALERT)
      }
    }
  }
}
