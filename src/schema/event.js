import moment from 'moment'
import {getSessionUserId, getUserGroup } from '../utils/getUserId'
import { storeUpload, processUpload } from '../utils/upload'


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
        image: Upload
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

    Event: {
      imageURL: (parent, _, {url}) => parent.imageURL ? `${url}/images/${parent.imageURL}` : `${url}/images/default.png`
    },
    Query: {
        async events(parent, args, { prisma, session }, info) {
          const target = await getUserGroup(prisma, session)
          const params = {where: { OR: [{
                                          title_contains: args.query},{
                                          subtitle_contains: args.query},{
                                          body_contains: args.query }] } }
          if (target) params.where.AND = [{target_in: target}]
          return prisma.query.events(params, info)
        }
    },
    Mutation: {
        async createEvent(parent, { data }, { prisma, session }, info) {
            const imageURL = await processUpload(data.image)
            return prisma.mutation.createEvent({
                data: {
                    title: data.title,
                    subtitle: data.subtitle,
                    imageURL,
                    body: data.body,
                    published: data.published || false,
                    date: data.date,
                    target: data.target || "PUBLIC",
                    deleteUpon: data.deleteUpon || false,
                    venue: { connect: { id: data.venue } },
                    author: { connect: { id : getSessionUserId(session) } }
                }
            }, info)
        },
        async deleteEvent(parent, args, { prisma, session }, info) {
            if (!await prisma.exists.Event({ id: args.id, author: {id: getSessionUserId(session)} }) ) throw new Error('Event not found in database...')
            return prisma.mutation.deleteEvent({ where: { id: args.id }}, info)
        },
        async updateEvent(parent, args, { prisma, session }, info) {
            if ( !await prisma.exists.Event({ id: args.id, author: {id: getSessionUserId(session)} }) ) throw new Error('Event not found in database...')
            return prisma.mutation.updateEvent({ where: { id: args.id }, data: args.data }, info)
        }
    }
}
