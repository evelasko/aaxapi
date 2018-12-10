import moment from 'moment'
import getUserId from '../utils/getUserId'

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
        published: Boolean
    }
    input CreateNewsInput {
        title: String!
        subtitle: String
        body: String!
        imageURL: String
        expiration: DateTime
        target: UserGroup
        published: Boolean
    }
    input UpdateNewsInput {
        title: String
        subtitle: String
        body: String
        imageURL: String
        expiration: DateTime
        target: UserGroup
        published: Boolean
    }
    extend type Query {
        newses(query: String): [News]!
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
    News: {},
    Query: {
        newses(parent, args, { prisma }, info) {
            return prisma.query.newses(args, info)
        }
    },
    Mutation: {
        createNews(parent, args, { prisma, request }, info) {
            if (!args.data.expiration) args.data.expiration = moment().add(1, 'w').format()
            return prisma.mutation.createNews({
                data: {
                    title: args.data.title,
                    subtitle: args.data.subtitle,
                    imageURL: args.data.imageURL,
                    body: args.data.body,
                    published: args.data.published,
                    target: args.data.target || "PUBLIC",
                    expiration: args.data.expiration,
                    author: { connect: { id : getUserId(request) } }
                }
            }, info)
        },
        async deleteNews(parent, args, { prisma, request }, info) {
            if (!await prisma.exists.News({ id: args.id, author: {id: getUserId(request)} }) ) throw new Error('News not found...')
            return prisma.mutation.deleteNews({ where: { id: args.id }}, info)
        },
        async updateNews(parent, args, { prisma, request }, info) {
            if ( !await prisma.exists.News({ id: args.id, author: {id: getUserId(request)} }) ) throw new Error('News not found')
            return prisma.mutation.updateNews({ where: { id: args.id }, data: args.data }, info)
        }
    }
}