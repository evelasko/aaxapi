import * as _ from 'lodash';
import moment from 'moment';
import { cacheNews } from '../cache';
import { sendNotification } from '../utils/notifications';
// import { PUBSUB_NEW_NEWS } from '../constants';
import { getNewsById, getUserById } from '../utils/queryCache';
import { aWeekFromNow, isBeforeNow } from '../utils/time';
import { deleteImage, getSecureImage, processUpload } from '../utils/upload';

const or = (search) => [{title_contains: search || ''},{subtitle_contains: search || ''},{body_contains: search || ''}]

// ---------------------------------------------------
//      TYPE DEFS
// ---------------------------------------------------

export const typeDef = `
    type News {
        id: ID!
        author: User!
        title: String!
        subtitle: String
        body: String!
        imageURL: String
        expiration: DateTime!
        target: UserGroup
        category: NewsCategory
        featured: Boolean
        deleteUpon: Boolean
        published: Boolean
        createdAt: DateTime!
        updatedAt: DateTime!
    }
    input CreateNewsInput {
        title: String!
        subtitle: String
        body: String!
        image: Upload
        expiration: DateTime
        category: NewsCategory
        featured: Boolean
        target: UserGroup
        deleteUpon: Boolean
        published: Boolean
    }
    input UpdateNewsInput {
        title: String
        subtitle: String
        body: String
        image: Upload
        imageURL: String
        expiration: DateTime
        category: NewsCategory
        featured: Boolean
        target: UserGroup
        deleteUpon: Boolean
        published: Boolean
    }
    extend type Query {
        aNews(id: ID!): News!
        newses(query: String): [News]!
        alerts(query: String): [News]!
        calls(query: String): [News]!
        allNews(query: String): [News]!
        allNewsMobile(per: String): [News]!
    }
    extend type Mutation {
        createNews(data: CreateNewsInput! ): News!
        deleteNews(id: ID!): News!
        updateNews(id: ID!, data:UpdateNewsInput!): News!
        publishNews(id: ID!): AuthPayload!
    }
`

// ---------------------------------------------------
//      RESOLVERS
// ---------------------------------------------------

export const Resolvers = {
    News: {
      imageURL: ({imageURL}, _, {url}) => imageURL && imageURL != 'default.png' ? getSecureImage(imageURL) : `${url}/images/default.png`
    },
    Query: {
        aNews(parent, { id }, { prisma, session: { group, isAdmin, userId } }, info) {
            return prisma.query.news({where: { id }}, info)
        },
        async newses(parent, { query }, { prisma, session: { group, isAdmin, userId } }, info) {
            const params = {where:{ OR: or(query), AND: [{category:'NEWS'}] } }
            const target_in = userId ? [group, 'PUBLIC'] : ['PUBLIC']
            if (!isAdmin) params.where.AND.push({target_in})
            return prisma.query.newses(params, info)
        },
        async alerts(parent, { query }, { prisma, session: { group, isAdmin, userId } }, info) {
            const params = {where:{ OR: or(query), AND: [{category:'ALERT'}] } }
            const target_in = userId ? [group, 'PUBLIC'] : ['PUBLIC']
            if (!isAdmin) params.where.AND.push({target_in})
            return await prisma.query.newses(params, info)
        },
        async calls(parent, { query }, { prisma, session: { group, isAdmin, userId } }, info) {
            const params = {where:{ OR: or(query), AND: [{category:'CALL'}] } }
            const target_in = userId ? [group, 'PUBLIC'] : ['PUBLIC']
            if (!isAdmin) params.where.AND.push({target_in})
            return prisma.query.newses(params, info)
        },
        async allNews(parent, { query }, { prisma, session: { group, isAdmin, userId } }, info) {
            const target_in = group ? [group, 'PUBLIC'] : ['PUBLIC']
            const params = {where: { OR: or(query) } }
            if (!isAdmin) params.where.AND = [{target_in}]
            return prisma.query.newses(params, info)
        },
        async allNewsMobile(parent, { per }, { prisma } , info) {
            const user = await getUserById(per)
            const params = { 
                orderBy: 'createdAt_DESC',
                where: { AND : [
                        user && user.isAdmin ? {} : { 
                            target_in: user && user.group ? [ user.group, 'PUBLIC'] : ['PUBLIC']     
                        },
                        { expiration_gte: moment() }
                    ]
                }
            }
            return prisma.query.newses(params, info)
        }
    },
    Mutation: {
        async createNews(parent, { data }, { prisma, pubsub, session: { userId, isAdmin } }, info) {
            if (!userId) throw new Error('Authentication required')
            if (!isAdmin) throw new Error('Admin privileges required')
            if (!isBeforeNow(data.expiration)) throw new Error('Expiration cannot be before now...')
            let imageURL = 'default.png'
            if (data.image) {imageURL = await processUpload(data.image)}
            try {
                const res = await prisma.mutation.createNews({
                    data: {
                        title: data.title,
                        subtitle: data.subtitle,
                        imageURL,
                        body: data.body,
                        published: data.published || false,
                        target: data.target || "PUBLIC",
                        category: data.category,
                        featured: data.featured,
                        expiration: data.expiration || aWeekFromNow(),
                        deleteUpon: data.deleteUpon || false,
                        author: { connect: { id : userId } }
                    }
                }, info)
                await cacheNews()
                if ( res.id ) {
                    const newsToSend = await getNewsById(res.id)
                    console.log('NEWS TO SEND: ', newsToSend)
                    const recipients = await prisma.query.users({
                        where: { AND: [
                            {notificationsDevice_not: null},
                            {group_in: newsToSend.target != 'PUBLIC' ? [newsToSend.target] : ['PUBLIC', 'STAFF', 'STUDENT'] },
                            {notificationsPermission: true}
                        ]}
                    },'{ notificationsDevice }')
                    console.log('RECIPIENTS: ', recipients)
                    await sendNotification(recipients, data.title, {id: res.id})
                }
                return res
            } catch(err) { throw new Error(err.message) }
            // const newNews = await getNewsById(res.id)
            // pubsub.publish(PUBSUB_NEW_NEWS, { newNews })
        },
        async deleteNews(parent, { id }, { prisma, session: { userId } }, info) {
            if (!userId) throw new Error('Authentication required')
            const original = await getNewsById(id)
            console.log(original)
            if (original.author != userId) throw new Error('News not owned by you')
            deleteImage(original.imageURL)
            const res = await prisma.mutation.deleteNews({ where: { id }}, info)
            await cacheNews()
            return res
        },
        async updateNews(parent, {id, data}, { prisma, session: { userId } }, info) {
            if (!userId) throw new Error('Authentication required')
            const original = await getNewsById(id)
            if (!original) throw new Error('News not found...')
            if (original.author != userId) throw new Error('News not owned by you')
            if ( data.expiration && !isBeforeNow(data.expiration) ) throw new Error('Expiration cannot be before now...')
            if (data.image) {
              deleteImage(original.imageURL)
              data.imageURL = await processUpload(data.image)
              data = _.omit(data, 'image')
            }
            const res = await prisma.mutation.updateNews({ where: { id }, data }, info)
            await cacheNews()
            return res
        },
        async publishNews(parent, {id}, { prisma, session: { userId } }, info) {
            if (!userId) throw new Error('Authentication required')
            const original = await getNewsById(id)
            if (!original) throw new Error('News not found...')
            if (original.author != userId) throw new Error('News not owned by you')
            if ( original.expiration && !isBeforeNow(original.expiration) ) throw new Error('Expiration cannot be before now...')
            try{
                const res = await prisma.mutation.updateNews({ where: { id }, data:{published: true} }, '{id}')
                await cacheNews()
                return {token: res.id}
            } catch(error) { return {error: `Error @publishNews: ${error.message}`} }
            
        }
    }
}
