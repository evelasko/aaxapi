import moment from 'moment'
import * as _ from 'lodash'
import {getSessionUserId, getUserGroup } from '../utils/getUserId'
import { storeUpload, processUpload, deleteImage } from '../utils/upload'
import { isBeforeNow, aWeekFromNow } from '../utils/time'


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
        image: Upload
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
        updateEvent(id: ID!, data:UpdateEventInput!): AuthPayload!
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
            let imageURL = 'default.png'
            if (data.image) {imageURL = await processUpload(data.image)}
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
        async deleteEvent(parent, {id}, { prisma, session }, info) {
            if (!await prisma.exists.Event({ id , author: {id: getSessionUserId(session)} }) ) throw new Error('Event not found in database...')
            const original = await prisma.query.event({where: {id}}, '{ imageURL }')
            deleteImage(original.imageURL)
            return prisma.mutation.deleteEvent({ where: {id}}, info)
        },
        async updateEvent(parent, {id, data}, { prisma, session }, info) {
            if ( !await prisma.exists.Event({ id, author: {id: getSessionUserId(session)} }) ) throw new Error('Event not found in database...')
            if ( data.date && !isBeforeNow(data.date) ) throw new Error('Event date cannot be before now...')
            if (data.image) {
              const { imageURL } = await prisma.query.event({where: {id}}, '{ imageURL }')
              deleteImage(imageURL)
              data.imageURL = await processUpload(data.image)
              data = _.omit(data, 'image')
            }
            if (data.venue) { data.venue = {connect: { id: data.venue}} }
            try {
              const token = prisma.mutation.updateEvent({ where: { id }, data }, '{id}')
              return { token: token.id }
            } catch(error) { return {error: error.message} }
        }
    }
}
