import moment from 'moment'
import getUserId from '../utils/getUserId'


// ---------------------------------------------------
//      TYPE DEFS
// ---------------------------------------------------


export const typeDef = `
    type Event {
        id: ID!
        author: User!
        title: String!
        subtitle: String
        body: String!
        imageURL: String
        date: DateTime!
        target: UserGroup
        published: Boolean
        deleteUpon: Boolean
        venue: Venue!
    }
    input CreateEventInput {
        title: String!
        subtitle: String
        body: String!
        imageURL: String
        date: DateTime!
        target: UserGroup
        published: Boolean
        deleteUpon: Boolean
        venue: ID!
    }
    input UpdateEventInput {
        title: String
        subtitle: String
        body: String
        imageURL: String
        date: DateTime
        target: UserGroup
        published: Boolean
        deleteUpon: Boolean
        venue: ID
    }
    extend type Query {
        events(query: String): [Event]!
    }
    extend type Mutation {
        createEvent(data: CreateEventInput! ): Event!
        deleteEvent(id: ID!): Event!
        updateEvent(id: ID!, data:UpdateEventInput!): Event!
    }
`

// ---------------------------------------------------
//      RESOLVERS
// ---------------------------------------------------

export const Resolvers = {

    Event: {},
    Query: {
        events(parent, args, { prisma }, info) {
            return prisma.query.events(args, info)
        }
    },
    Mutation: {
        createEvent(parent, args, { prisma, request }, info) {
            return prisma.mutation.createEvent({
                data: {
                    title: args.data.title,
                    subtitle: args.data.subtitle,
                    imageURL: args.data.imageURL,
                    body: args.data.body,
                    published: args.data.published || false,
                    date: args.data.date,
                    target: args.data.target || "PUBLIC",
                    deleteUpon: args.data.deleteUpon || false,
                    venue: { connect: { id: args.data.venue } },
                    author: { connect: { id : getUserId(request) } }
                }
            }, info)
        },
        async deleteEvent(parent, args, { prisma, request }, info) {
            if (!await prisma.exists.Event({ id: args.id, author: {id: getUserId(request)} }) ) throw new Error('Event not found in database...')
            return prisma.mutation.deleteEvent({ where: { id: args.id }}, info)
        },
        async updateEvent(parent, args, { prisma, request }, info) {
            if ( !await prisma.exists.Event({ id: args.id, author: {id: getUserId(request)} }) ) throw new Error('Event not found in database...')
            return prisma.mutation.updateEvent({ where: { id: args.id }, data: args.data }, info)
        }
    }
}
