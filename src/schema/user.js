import bcrypt from 'bcryptjs'
import isEmail from 'validator/lib/isEmail'
import { getUserId, getSessionUserId } from '../utils/getUserId'
import { generateToken, generateResetToken } from '../utils/generateToken'
import hashPassword from '../utils/hashPassword'
import { sendEmail, sendConfirmationEmail, sendResetPassword, sendConfirmGroup, sendRejectGroup } from '../utils/emailService.js'
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
    groupRequest: UserGroup
    nID: String
    nIDType: nIdType
}
input UpdateUserInput {
    name: String
    lastname: String
    group: UserGroup
    isAdmin: Boolean
}
extend type Query {
    users(query: String, group: UserGroup): [User!]!
    me: UserPayload
    userGroupRequest: [User!]!
}
extend type Mutation {
    signUpUser(data: CreateUserInput!): AuthPayload!
    loginUser(data: LoginUserInput!): AuthPayload!
    deleteUser: UserPayload!
    logoutUser: AuthPayload!
    confirmGroupRequest(id: String!, confirm: Boolean!): AuthPayload!
    setAdmin(id: String!): AuthPayload!
    unsetAdmin(id: String!): AuthPayload!
    updateUser(data: UpdateUserInput! ): UserPayload!
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
        users(parent, { query, group }, { prisma }, info) {
            const q = {where: { OR: [ { name_contains: query || ''}, {lastname_contains: query || ''}, {email_contains: query || ''} ] }}
            if (group) q.where.AND = [{group}]
            return prisma.query.users(q, info)
        },
        async me(parent, args, { prisma, session }, info) {
            const id = getSessionUserId(session)
            if (!id) return {error: 'Query: Me | Error: No user authenticated...'}
            const user = await prisma.query.user({ where: { id } }, '{  id name lastname email group isAdmin }')
            return { user }
        },
        async userGroupRequest(parent, args, { prisma, session }, info) {
            const id = getSessionUserId(session)
            if (!id) return {error: '@userGroupRequest: Authentication required...'}
            if (!session.isAdmin) { return {error: '@userGroupRequest: Needs admin permission for this task'}}
            return await prisma.query.users({where: {groupRequest_not: null}}, info)
        }
    },
    Mutation: {
        async signUpUser(parent, {data}, { prisma }, info) {
          try {
            if (!isEmail(data.email)) return { error: '@signUpUser: email not valid' } // throw new Error('The email address is not valid')
            if (await prisma.exists.User({email: data.email})) return { error: '@signUpUser: email already registered' }
            const password = await hashPassword(data.password)
            if (data.groupRequest && data.groupRequest != 'PUBLIC') {
              await sendEmail('enrique.prez.velasco@gmail.com', 'aaXadmin: User Group Request', `User ${data.name} ${data.lastname} has requested to join ${data.groupRequest} group. Please review this case to confirm the join.`)
            }
            data.group = 'PUBLIC'
            const user = await prisma.mutation.createUser({ data: { ...data, password } }, '{ id }')
            // UPDATE USERS CACHE
            const token = generateResetToken(user)
            const link = `${process.env.FRONT_END_HOST}confirm-email/${token}`
            const res = await sendConfirmationEmail(data.email, link)
            return { token: user.id }
          }
          catch(error) {
            return { error: `@signUpUser: ${error.message}`}
          }
        },
        async confirmEmail(parent, args, { prisma }, info) {
            const id = getUserId(args.key)
            if (id.error) return {error: `@confirmEmail: ${id.error}`}
            const res = await prisma.mutation.updateUser({ where: { id }, data: {emailVerified: true} }, '{ id emailVerified}')
            if ( res.id === id && res.emailVerified ) {
              // UPDATE USERS CACHE
              return { token: id }
            }
            return { error: `@confirmEmail: oops... something went wrong while confirming your email` }
        },
        async sendForgotPasswordEmail(parent, {email}, { prisma }, info) {
            if (! await prisma.exists.User({ email })) return {error: 'Mutation: sendForgotPasswordEmail | Error: email not found'}
            const token = generateResetToken(await prisma.query.user({ where: { email } }, '{ id }'))
            const link = `${process.env.FRONT_END_HOST}change-password/${token}`
            const { name } = await prisma.query.user({ where: { email } }, '{ name }')
            const res = await sendResetPassword(email, link, name)
            return { token }
        },
        async changePassword(parent, args, { prisma, session }, info) {
            const id = args.key ? getUserId(args.key) : getSessionUserId(session)
            if (!id) return {error: '@changePassword: Invalid token or user not logged in'}
            if (typeof args.newPassword === 'string') args.newPassword = await hashPassword(args.newPassword)
            try {
              const res = await prisma.mutation.updateUser({ where: { id }, data: { password: args.newPassword } }, '{ id }')
              // UPDATE USERS CACHE
              return { token: res.id }
            } catch(error) { return {error: `@changePassword: ${error.message}`} }

        },
        async loginUser(parent, args, { prisma, session, request, redis }, info) {
            const user = await prisma.query.user({ where: { email: args.data.email } })
            if ( !user  ) return {error: `@loginUser: User not found`}
            const match = await bcrypt.compare(args.data.password, user.password)
            if ( !match ) return {error: `@loginUser: Invalid password`} // throw new Error('incorrect password, try again')
            if (!user.emailVerified) {
              const token = generateResetToken({id: user.id})
              const link = `${process.env.FRONT_END_HOST}confirm-email/${token}`
              const res = await sendConfirmationEmail(args.data.email, link)
              return {error: '@loginUser: eMail not verified'}
            }
            session.userId = user.id
            session.isAdmin = user.isAdmin
            session.group = user.group
            if (request.sessionID) { await redis.lpush(`${userSessionIdPrefix}${user.id}`, request.sessionID) }
            return { token: user.id }
        },
        async deleteUser(parent, args, { prisma, session }, info) {
          const id = getSessionUserId(session)
          try {
            return await prisma.mutation.deleteUser({ where: { id } }, info)
            // UPDATE USERS CACHE (TAKE CARE OF THE RETURN STATEMENT IN THE LINE ABOVE)
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
              // UPDATE USERS CACHE (TAKE CARE OF THE RETURN STATEMENT IN THE LINE ABOVE)
            }} catch(error) { return {error: `@updateUser: ${error.message}`}}
            return {error: `@updateUser: unknown error`}
        },
        async confirmGroupRequest(parent, { id, confirm }, { prisma, session }, info) {
            const adminId = getSessionUserId(session)
            if (! await prisma.query.user({where: {id: adminId}}, '{ isAdmin }')) { return {error: 'Needs admin permission for this task'}}
            if (! await prisma.exists.User({id})) return {error: 'Mutation: confirmGroupRequest | Error: user not found'}
            try {
              const { group, groupRequest } = await prisma.query.user({where: {id}}, '{ group groupRequest }')
              if (!groupRequest) { return {error:'@confirmGroupRequest: no request found...'}}
              if (confirm && groupRequest) {
                const res = await prisma.mutation.updateUser({where: {id}, data:{group: groupRequest, groupRequest: null}}, '{id email name lastname}' )
                // UPDATE USERS CACHE
                sendConfirmGroup(res.email, res.name, groupRequest)
                return {token: res.id}
              }
              else {
                const res = await prisma.mutation.updateUser({where: {id}, data:{groupRequest: null}}, '{id, email, name}' )
                // UPDATE USERS CACHE
                sendRejectGroup(res.email, res.name, groupRequest)
                return {token: res.id}
              }
            } catch(error) { return {error: `@confirmGroupRequest: ${error}`}}
        },
        async setAdmin(parent, {id}, { prisma, session }, info) {
            const adminId = getSessionUserId(session)
            if (!adminId) { return {error: 'Authentication required'} }
            if (! await prisma.query.user({where: {id: adminId}}, '{ isAdmin }')) { return {error: 'Needs admin permission for this task'}}
            if (! await prisma.exists.User({id})) return {error: 'setAdmin: user not found'}
            try {
              const res = await prisma.mutation.updateUser({where: {id}, data:{isAdmin:true}}, '{id}')
              // UPDATE USERS CACHE
              return {token: res.id}
            } catch(error) { return {error: `@setAdmin: ${error.message}`}}
        },
        async unsetAdmin(parent, {id}, { prisma, session }, info) {
            const adminId = getSessionUserId(session)
            if (!adminId) { return {error: 'Authentication required'} }
            if (! await prisma.query.user({where: {id: adminId}}, '{ isAdmin }')) { return {error: 'Needs admin permission for this task'}}
            if (! await prisma.exists.User({id})) return {error: 'setAdmin: user not found'}
            try {
              const res = await prisma.mutation.updateUser({where: {id}, data:{isAdmin:false}}, '{id}')
              // UPDATE USERS CACHE
              return {token: res.id}
            } catch(error) { return {error: `@unsetAdmin: ${error.message}`}}
        }

    }
}
