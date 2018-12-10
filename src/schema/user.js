import bcrypt from 'bcryptjs'
import getUserId from '../utils/getUserId'
import generateToken from '../utils/generateToken';
import hashPassword from '../utils/hashPassword';

// ---------------------------------------------------
//      TYPE DEFS
// ---------------------------------------------------

export const typeDef = `
type User {
    id: ID! 
    name: String
    lastname: String
    email: String
    emailVerified: Boolean
    password: String!
    group: UserGroup!
    address: Address
    phone: PhoneNumber
    isAdmin: Boolean
    newses: [News!]!
    events: [Event!]!
}
type AuthPayload {
    token: String!
    user: User!
}
input LoginUserInput {
    email: String!
    password: String!
}
input CreateUserInput {
    email: String!
    password: String!
    name: String
    lastname: String 
    group: UserGroup
    isAdmin: Boolean
}
input UpdateUserInput {
    name: String
    lastname: String
    email: String 
    emailVerified: Boolean
    password: String
    group: UserGroup
    isAdmin: Boolean
}
extend type Query {
    users(query: String, first: Int, skip: Int): [User!]!
    me: User!
}
extend type Mutation {
    createUser(data: CreateUserInput!): AuthPayload!
    loginUser(data: LoginUserInput!): AuthPayload!
    deleteUser: User!
    updateUser(data: UpdateUserInput! ): User!
}
`

// ---------------------------------------------------
//      RESOLVERS
// ---------------------------------------------------

export const Resolvers = {
    User: {
        email: {
            fragment: 'fragment userId on User { id }',
            resolve(parent, args, { request }, info) {
                const userId = getUserId(request, false)
                if (userId && userId === parent.id) {
                    return parent.email
                } else { return null }
            }
        }
    },
    Query: {
        users(parent, args, { prisma }, info) {
            const opArgs = { 
                first: args.first, 
                skip: args.skip,
                after: args.after,
                orderBy: args.orderBy
            }
            if (args.query) {
                opArgs.where = {
                    OR: [
                        { name_contains: args.query }
                    ]
                }
            }
            return prisma.query.users(opArgs, info)
        },
        me(parent, args, { prisma, request }, info) { 
            return prisma.query.user({ where: { id: getUserId(request) } }, info) 
        }
    },
    Mutation: {
        async createUser(parent, args, { prisma }, info) {
            const password = await hashPassword(args.data.password)
            const user = await prisma.mutation.createUser({ data: { ...args.data, password } })
            return {user, token: generateToken(user.id)}
        },
        async loginUser(parent, args, { prisma }, info) {
            const user = await prisma.query.user({ where: { email: args.data.email } })
            if ( !user  ) throw new Error(`Error: user with email: ${args.data.email} was not found`)
            const match = await bcrypt.compare(args.data.password, user.password)
            if ( !match ) throw new Error('incorrect password, try again')
            return {user, token: generateToken(user.id)}
        },
        async deleteUser(parent, args, { prisma, request }, info) {
            return prisma.mutation.deleteUser({ where: { id: getUserId(request) } }, info)
        },
        async updateUser(parent, args, { prisma, request }, info) {
            if (typeof args.data.password === 'string') args.data.password = await hashPassword(args.data.password)
            return prisma.mutation.updateUser({ where: { id: getUserId(request) }, data: args.data }, info)
        }
    }
}