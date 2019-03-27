import * as _ from 'lodash';
import moment from 'moment';
import { cacheEvents } from '../cache';
import { sendNotification } from '../utils/notifications';
import { getEventById, getUserById } from '../utils/queryCache';
import { isBeforeNow } from '../utils/time';
import { deleteImage, getSecureImage, processUpload } from '../utils/upload';


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
        eventsMobile(per: String): [Event]!
    }
    extend type Mutation {
        createEvent(data: CreateEventInput! ): Event!
        deleteEvent(id: ID!): Event!
        updateEvent(id: ID!, data:UpdateEventInput!): AuthPayload!
        publishEvent(id: ID!): AuthPayload!
    }
`

// ---------------------------------------------------
//      RESOLVERS
// ---------------------------------------------------

export const Resolvers = {

    Event: {
        imageURL: ({imageURL}, _, {url}) => imageURL && imageURL != 'default.png' ? getSecureImage(imageURL) : `${url}/images/default.png`
    },
    Query: {
        async events(parent, {query}, { prisma, session: { userId, isAdmin, group } }, info) {
            const params = {where: { OR: [
                                          {title_contains: query},
                                          {subtitle_contains: query},
                                          {body_contains: query }
                                        ]}, orderBy: 'date_ASC'}
            const target_in = userId ? [group, 'PUBLIC'] : ['PUBLIC']
            if (!isAdmin) params.where.AND = [{target_in}]
            return prisma.query.events(params, info)
        },
        async eventsMobile(parent, { per}, { prisma }, info) {
            const user = await getUserById(per)
            const params = { 
                orderBy: 'date_ASC',
                where: { 
                    AND : [
                        user && user.isAdmin ? {} : { 
                            target_in: user && user.group ? [ user.group, 'PUBLIC'] : ['PUBLIC']     
                        },
                        { date_gte: moment() }
                    ]
                }
            }
            return prisma.query.events(params, info)
        }
    },
    Mutation: {
        async createEvent(parent, { data }, { prisma, session: { userId, isAdmin } }, info) {
            if (!userId) throw new Error('Authentication required')
            if (!isAdmin) throw new Error('Admin privileges required')
            let imageURL = 'default.png'
            if (data.image) {imageURL = await processUpload(data.image)}
            const res = await prisma.mutation.createEvent({
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
                    author: { connect: { id : userId } }
                }
            }, info)
            if ( res.id ) {
                await cacheEvents()
                const eventToSend = await getEventById(res.id)
                if (!eventToSend) { throw new Error('Unable to send notification... event not found on cache')}
                const recipients = await prisma.query.users({
                    where: { AND: [
                        { notificationsDevice_not: null},
                        { group_in: eventToSend.target == 'PUBLIC' ? ['PUBLIC', 'STAFF', 'STUDENT'] : ['PUBLIC', eventToSend.target] },
                        { notificationsPermission: true}
                    ] }
                },'{ notificationsDevice }')
                await sendNotification(recipients, 'Nuevo Evento', data.title, {id: res.id})
            }
            return res
        },
        async deleteEvent(parent, { id }, { prisma, session: { userId } }, info) {
            if (!userId) throw new Error('Authentication required')
            const original = await getEventById(id)
            if (!original) throw new Error('Event not found...')
            if (original.author != userId) throw new Error('Event not owned by you')
            deleteImage(original.imageURL)
            const res = await prisma.mutation.deleteEvent({ where: {id}}, info)
            await cacheEvents()
            return res
        },
        async updateEvent(parent, {id, data}, { prisma, session: { userId } }, info) {
            if (!userId) throw new Error('Authentication required')
            const original = await getEventById(id)
            if (!original) throw new Error('Event not found...')
            if (original.author != userId) throw new Error('Event not owned by you')
            if ( data.date && !isBeforeNow(data.date) ) throw new Error('Event date cannot be before now...')
            if (data.image) {
              deleteImage(original.imageURL)
              data.imageURL = await processUpload(data.image)
              data = _.omit(data, 'image')
            }
            if (data.venue) { data.venue = {connect: { id: data.venue}} }
            try {
              const res = await prisma.mutation.updateEvent({ where: { id }, data }, '{id}')
              await cacheEvents()
              return { token: res.id }
            } catch(error) { return {error: error.message} }
        },
        async publishEvent(parent, {id}, { prisma, session: { userId } }, info) {
            if (!userId) throw new Error('Authentication required')
            const original = await getEventById(id)
            if (!original) throw new Error('Event not found...')
            if (original.author != userId) throw new Error('Event not owned by you')
            if ( original.date && !isBeforeNow(original.date) ) throw new Error('Event date cannot be before now...')
            try {
              const res = await prisma.mutation.updateEvent({ where: { id }, data:{published: true} }, '{id}')
              await cacheEvents()
              return { token: res.id }
            } catch(error) { return {error: error.message} }
        }
    }
}
