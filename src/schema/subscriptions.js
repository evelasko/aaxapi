// import { PUBSUB_NEW_NEWS } from '../constants';

// // ---------------------------------------------------
// //      TYPE DEFS
// // ---------------------------------------------------

// export const typeDef = `
// type Subscription {
//     newNews: News!
// }
// `

// // ---------------------------------------------------
// //      SUBSCRIPTION
// // ---------------------------------------------------

// export const Resolvers = {
//   Subscription: {
//     newNews: {
//       subscribe (_, __, {pubsub}) {
//         return pubsub.asyncIterator(PUBSUB_NEW_NEWS)
//       }
//     }
//   }
// }
