import moment from 'moment'
import * as _ from 'lodash'
import { getUserId, getSessionUserId, getUserGroup } from '../utils/getUserId'
import { isBeforeNow, aWeekFromNow } from '../utils/time'
import { storeUpload, processUpload, imagesPath, deleteImage } from '../utils/upload'
import { getNewsParams } from '../utils/queryParams.js'

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
    }
    extend type Mutation {
        createNews(data: CreateNewsInput! ): News!
        deleteNews(id: ID!): News!
        updateNews(id: ID!, data:UpdateNewsInput!): News!
    }
`

// ---------------------------------------------------
//      RESOLVERS
// ---------------------------------------------------

export const Resolvers = {
    News: {
      imageURL: (parent, _, {url}) => parent.imageURL ? `${url}/images/${parent.imageURL}` : `${url}/images/default.png`
    },
    Query: {
        aNews(parent, args, { prisma }, info) {
            return prisma.query.news({where: {id: args.id}}, info)
        },
        async newses(parent, args, { prisma, session }, info) {
            const params = {where:{ OR: or(args.query), AND: [{category:'NEWS'}] } }
            const target = await getUserGroup(prisma, session)
            if (target) params.where.AND.push({target_in: target})
            return prisma.query.newses(params, info)
        },
        async alerts(parent, args, { prisma, session }, info) {
            const params = {where:{ OR: or(args.query), AND: [{category:'ALERT'}] } }
            const target = await getUserGroup(prisma, session)
            if (target) params.where.AND.push({target_in: target})
            return prisma.query.newses(params, info)
        },
        async calls(parent, args, { prisma, session }, info) {
            const params = {where:{ OR: or(args.query), AND: [{category:'CALL'}] } }
            const target = await getUserGroup(prisma, session)
            if (target) params.where.AND.push({target_in: target})
            return prisma.query.newses(params, info)
        },
        async allNews(parent, args, { prisma, session }, info) {
            const target = await getUserGroup(prisma, session)
            const params = {where: { OR: or(args.query) } }
            if (target) params.where.AND = [{target_in: target}]
            return prisma.query.newses(params, info)
        }
    },
    Mutation: {
        async createNews(parent, { data }, { prisma, session }, info) {
            if (!isBeforeNow(data.expiration)) throw new Error('Expiration cannot be before now...')
            let imageURL = 'default.png'
            if (data.image) {imageURL = await processUpload(data.image)}
            return prisma.mutation.createNews({
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
                    author: { connect: { id : getSessionUserId(session) } }
                }
            }, info)
        },
        async deleteNews(parent, args, { prisma, session }, info) {
            if (!await prisma.exists.News({ id: args.id, author: {id: getSessionUserId(session)} }) ) throw new Error('News not found...')
            const original = await prisma.query.news({where: {id: args.id}}, '{ imageURL }')
            deleteImage(original.imageURL)
            return prisma.mutation.deleteNews({ where: { id: args.id }}, info)
        },
        async updateNews(parent, {id, data}, { prisma, session }, info) {
            if ( !await prisma.exists.News({ id, author: {id: getSessionUserId(session)} }) ) throw new Error('News not found')
            if ( data.expiration && !isBeforeNow(data.expiration) ) throw new Error('Expiration cannot be before now...')
            if (data.image) {
              const original = await prisma.query.news({where: {id}}, '{ imageURL }')
              deleteImage(original.imageURL)
              data.imageURL = await processUpload(data.image)
              data = _.omit(data, 'image')
            }
            return prisma.mutation.updateNews({ where: { id }, data }, info)
        }
    }
}
