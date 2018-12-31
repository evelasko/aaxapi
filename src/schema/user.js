import bcrypt from 'bcryptjs'
import isEmail from 'validator/lib/isEmail'
import { getUserId, getSessionUserId } from '../utils/getUserId'
import { generateToken, generateResetToken } from '../utils/generateToken'
import hashPassword from '../utils/hashPassword'
import { sendEmail } from '../utils/sendEmail'

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
    token: String
    error: String
}
type RegisterPayload {
  user: User
  token: String
  error: String
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
    group: UserGroup
    isAdmin: Boolean
}
extend type Query {
    users(query: String, first: Int, skip: Int): [User!]!
    me: User!
}
extend type Mutation {
    signUpUser(data: CreateUserInput!): RegisterPayload!
    loginUser(data: LoginUserInput!): AuthPayload!
    deleteUser: User!
    updateUser(data: UpdateUserInput! ): User!
    sendForgotPasswordEmail(email: String!): AuthPayload!
    changePassword(newPassword: String!, key: String!): AuthPayload!
    confirmEmail(key: String!): AuthPayload!
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
        async signUpUser(parent, args, { prisma }, info) {
            if (!isEmail(args.data.email)) return { error: 'email not valid' } // throw new Error('The email address is not valid')
            if (await prisma.exists.User({email: args.data.email})) return { error: 'email already registered' }
            const password = await hashPassword(args.data.password)
            const user = await prisma.mutation.createUser({ data: { ...args.data, password } })
            const token = generateResetToken(user.id)
            const link = `${process.env.FRONT_END_HOST}/confirm-email/${token}`
            console.log('confirmation link: ', link)
            const res = await sendEmail(args.data.email, 'Confirm Email', `Please follow or copy this link in your browser: ${link} to confirm your email`, `<a href="${link}">click here to confirm your email</a>`)
            console.log(res)
            return {user, token}
        },
        async confirmEmail(parent, args, { prisma }, info) {
            const userId = getUserId({request: {headers: {authorization: `Bearer ${args.key}`}}}, false)
            if (!userId) return {error: 'invalid token'}
            const res = await prisma.mutation.updateUser({ where: { id: userId }, data: {emailVerified: true} }, info)
            return {token: 'email verified'}
        },
        async sendForgotPasswordEmail(parent, args, { prisma }, info) {
            if (! await prisma.exists.User({email: args.email})) return {error: 'email not found'}
            const token = generateResetToken(await prisma.query.user({ where: { email: args.email } }, '{ id }'))
            const link = `${process.env.FRONT_END_HOST}/change-password/${token}`
            const res = await sendEmail(args.email, 'Reset Password', `copy this link in your browser: ${link}`, `<a href="${link}">click here to reset your password</a>`)
            console.log('response from mailgun: ', res)
            return { token }
        },
        async changePassword(parent, args, { prisma }, info) {
            const userId = getUserId({request: {headers: {authorization: `Bearer ${args.key}`}}}, false)
            if (!userId) return {error: 'invalid token'}
            if (typeof args.newPassword === 'string') args.newPassword = await hashPassword(args.newPassword)
            const userCheck = await prisma.mutation.updateUser({ where: { id: userId.id }, data: { password: args.newPassword } }, '{id}')
            return {token: generateToken(userId)}
        },
        async loginUser(parent, args, { prisma, request }, info) {
            const user = await prisma.query.user({ where: { email: args.data.email } })
            if ( !user  ) return {error: `user not found`} // throw new Error(`Error: user with email: ${args.data.email} was not found`)
            const match = await bcrypt.compare(args.data.password, user.password)
            if ( !match ) return {error: `invalid login`} // throw new Error('incorrect password, try again')
            if (!user.emailVerified) {
              const token = generateToken(user.id)
              const link = `${process.env.FRONT_END_HOST}/confirm-email/${token}`
              const res = await sendEmail(args.email, 'Confirm Email', `Please follow or copy this link in your browser: ${link} to confirm your email`, `<a href="${link}">click here to confirm your email</a>`)
              return {error: `please verify your email`}
            }
            request.request.session.userId = user.id
            return {token: generateToken(user.id)}
        },
        async deleteUser(parent, args, { prisma, request }, info) {
          return prisma.mutation.deleteUser({ where: { id: getSessionUserId(request) } }, info)
        },
        async updateUser(parent, args, { prisma, request }, info) {
            if (typeof args.data.password === 'string') args.data.password = await hashPassword(args.data.password)
            return prisma.mutation.updateUser({ where: { id: getSessionUserId(request) }, data: args.data }, info)
        }
    }
}
