import bcrypt from 'bcryptjs'
import isEmail from 'validator/lib/isEmail'
import { getUserId, getSessionUserId } from '../utils/getUserId'
import { generateToken, generateResetToken } from '../utils/generateToken'
import hashPassword from '../utils/hashPassword'
import { sendEmail } from '../utils/emailService.js'
import { userSessionIdPrefix } from '../constants.js'

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
    groupRequest: UserGroup
    address: Address
    phone: PhoneNumber
    isAdmin: Boolean
    newses: [News!]!
    events: [Event!]!
}
type UserPayload {
  user: User
  error: String
}
type AuthPayload {
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
    users(query: String): [User!]!
    me: UserPayload
}
extend type Mutation {
    signUpUser(data: CreateUserInput!): AuthPayload!
    loginUser(data: LoginUserInput!): AuthPayload!
    deleteUser: UserPayload!
    logoutUser: AuthPayload!
    updateUser(data: UpdateUserInput! ): UserPayload!
    updateUserByAdmin(id: ID!, data: UpdateUserInput! ): AuthPayload!
    sendForgotPasswordEmail(email: String!): AuthPayload!
    changePassword(key: String, newPassword: String!): AuthPayload!
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
            resolve(parent, args, { session }, info) {
                const userId = getSessionUserId(session)
                if (userId && userId === parent.id) {
                    return parent.email
                } else { return null }
            }
        }
    },
    Query: {
        users(parent, { query }, { prisma }, info) {
          console.log('users query requested')
            const q = query ?
              {where: { OR: [ { name_contains: query }, {lastname_contains: query}, {email_contains: query} ] }}
              :
              null
            return prisma.query.users(q && q, info)
        },
        async me(parent, args, { prisma, session }, info) {
            const id = getSessionUserId(session)
            if (!id) return {error: 'Query: Me | Error: No user authenticated...'}
            const user = await prisma.query.user({ where: { id } }, '{  id name lastname email group isAdmin }')
            return { user }
        }
    },
    Mutation: {
        async signUpUser(parent, args, { prisma }, info) {
          try {
            if (!isEmail(args.data.email)) return { error: '@signUpUser: email not valid' } // throw new Error('The email address is not valid')
            if (await prisma.exists.User({email: args.data.email})) return { error: '@signUpUser: email already registered' }
            const password = await hashPassword(args.data.password)
            if (args.data.groupRequest != 'PUBLIC') {
              await sendEmail('enrique.prez.velasco@gmail.com', 'aaXadmin: User Group Request', `User ${args.data.name} ${args.data.lastname} has requested to join ${args.data.groupRequest} group. Please review this case to confirm the join.`)
            }
            const id = await prisma.mutation.createUser({ data: { ...args.data, password } }, '{ id }')
            const token = generateResetToken(id)
            const link = `${process.env.FRONT_END_HOST}confirm-email/${token}`
            const res = await sendEmail(
                args.data.email,
                'Tu nueva cuenta en alicialonso.org',
                `Por favor usa el siguiente vínculo: ${link} para confirmar tu email`,
                `templates/emailConfirmation.hbs`,
                {
                  confirmation_link: link
                }
            )
            return { token }
          }
          catch(error) {
            return { error: `@signUpUser: ${error.message}`}
          }
        },
        async confirmEmail(parent, args, { prisma }, info) {
            const id = getUserId(args.key)
            if (id.error) return {error: `@confirmEmail: ${id.error}`}
            const res = await prisma.mutation.updateUser({ where: { id }, data: {emailVerified: true} }, '{ id emailVerified}')
            if ( res.id === id && res.emailVerified ) { return { token: id }}
            return { error: `@confirmEmail: oops... something went wrong while confirming your email` }
        },
        async sendForgotPasswordEmail(parent, args, { prisma }, info) {
            if (! await prisma.exists.User({email: args.email})) return {error: 'Mutation: sendForgotPasswordEmail | Error: email not found'}
            const token = generateResetToken(await prisma.query.user({ where: { email: args.email } }, '{ id }'))
            const link = `${process.env.FRONT_END_HOST}/change-password/${token}`
            const res = await sendEmail(args.email, 'Reset Password', `copy this link in your browser: ${link}`, `You requested to reset your password, <a href="${link}">click here to set a new password</a>`)
            return { token }
        },
        async changePassword(parent, args, { prisma, session }, info) {
            const id = args.key ? getUserId(args.key) : getSessionUserId(session)
            if (!id) return {error: '@changePassword: Invalid token or user not logged in'}
            if (typeof args.newPassword === 'string') args.newPassword = await hashPassword(args.newPassword)
            try {
              const res = await prisma.mutation.updateUser({ where: { id }, data: { password: args.newPassword } }, '{ id }')
              return { token: res.id }
            } catch(error) { return {error: `@changePassword: ${error.message}`} }

        },
        async loginUser(parent, args, { prisma, session, request, redis }, info) {
            const user = await prisma.query.user({ where: { email: args.data.email } })
            if ( !user  ) return {error: `@loginUser: User not found`}
            const match = await bcrypt.compare(args.data.password, user.password)
            if ( !match ) return {error: `@loginUser: Invalid password`} // throw new Error('incorrect password, try again')
            if (!user.emailVerified) {
              const token = generateToken(user.id)
              const link = `${process.env.FRONT_END_HOST}/confirm-email/${token}`
              const res = await sendEmail(args.email, 'Confirm Email', `Please follow or copy this link in your browser: ${link} to confirm your email`, `<a href="${link}">click here to confirm your email</a>`)
            }
            session.userId = user.id
            if (request.sessionID) { await redis.lpush(`${userSessionIdPrefix}${user.id}`, request.sessionID) }
            console.log('request session: ', request.session)
            console.log('end login mutation')
            return { token: user.id }
        },
        async deleteUser(parent, args, { prisma, session }, info) {
          const id = getSessionUserId(session)
          try {
            return await prisma.mutation.deleteUser({ where: { id } }, info)
          } catch(error) { return {error: `@deleteUser: ${error.message}`}}
        },
        async logoutUser(parent, args, {session, response}, info) {
          const id = getSessionUserId(session)
          if (id) {
            await session.destroy(err => {
              if (err) { console.log('ERROR @LOGOUTUSER MUTATION / SESSION DESTROY: ', err) }
            })
            response.clearCookie("qid")
            return { token: id }
          }
          return { error: '@logoutUser: no user authenticated...'}
        },
        async updateUser(parent, args, { prisma, session }, info) {
            const id = getSessionUserId(session)
            try {
            if (id) {
              if (typeof args.data.password === 'string') args.data.password = await hashPassword(args.data.password)
              return prisma.mutation.updateUser({ where: { id }, data: args.data }, info)
            }} catch(error) { return {error: `@updateUser: ${error.message}`}}
            return {error: `@updateUser: unknown error`}
        },
        async updateUserByAdmin(parent, { id, data: { isAdmin, group }, }, { prisma, session }, info) {
            const adminId = getSessionUserId(session)
            if (!adminId) { return {error: 'Authentication required'} }
            if (! await prisma.query.user({where: {id: adminId}}, '{ isAdmin }')) { return {error: 'Needs admin permission for this task'}}
            try {
              if (isAdmin === true) { group = 'STAFF' }
              const response = await prisma.mutation.updateUser({ where: { id }, data: { group, isAdmin } }, '{ id }')
              if (response.id === id) { return {token: response.id} }
            } catch(error) { return {error: `@updateUser: ${error.message}`} }
            return {error: `@updateUser: unknown error`}
        }

    }
}
