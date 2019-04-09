import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import isEmail from 'validator/lib/isEmail';
import { cacheUsers } from '../cache';
import { userSessionIdPrefix } from '../constants';
import { sendBetaWelcome, sendConfirmationEmail, sendConfirmGroup, sendEmail, sendRejectGroup, sendResetPassword } from '../utils/emailService';
import { generateResetToken } from '../utils/generateToken';
import hashPassword from '../utils/hashPassword';
import { getUserByEmail, getUserById } from '../utils/queryCache';

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

    notificationsDevice: String
    notificationsPermission: Boolean
    notificationsPrefEmail: Boolean
    notificationsPrefPush: Boolean
    notificationsPrefReminderEmail: Boolean
    notificationsPrefReminderPush: Boolean
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
input LoginUserMobileInput {
  email: String!
  password: String!
  deviceToken: String
  devicePermission: Boolean
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
    user(id:String!): User! 
    me: UserPayload
    userGroupRequest: [User!]!
}
extend type Mutation {
    signUpUser(data: CreateUserInput!): AuthPayload!
    loginUser(data: LoginUserInput!): AuthPayload!
    loginUserMobile(data: LoginUserMobileInput!): AuthPayload!
    deleteUser: UserPayload!
    logoutUser: AuthPayload!
    logoutUserMobile(per: String!): AuthPayload!
    confirmGroupRequest(id: String!, confirm: Boolean!): AuthPayload!
    setAdmin(id: String!): AuthPayload!
    unsetAdmin(id: String!): AuthPayload!
    updateUser(data: UpdateUserInput! ): UserPayload!
    sendForgotPasswordEmail(email: String!): AuthPayload!
    changePassword(key: String, newPassword: String!): AuthPayload!
    confirmEmail(key: String!): AuthPayload!
    unsubscribeEmail(email: String!): AuthPayload!
    inviteToBeta(emails: [String!]!): AuthPayload!
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
                if (!session.userId) { return null }
                if (session.userId === parent.id || session.isAdmin) {
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
        user(parent, {id}, {prisma}, info) {
          return prisma.query.user({where: {id}}, info)
        },
        async me(parent, args, { prisma, session }, info) {
            const id = session.userId
            if (!id) { return {error: 'Query: Me | Error: No user authenticated...'} }
            const user = getUserById(id)
            return { user }
        },
        async userGroupRequest(parent, args, { prisma, session }, info) {
            const id = session.userId
            if (!id) return {error: '@userGroupRequest: Authentication required...'}
            if (!session.isAdmin) { return {error: '@userGroupRequest: Needs admin permission for this task'}}
            return await prisma.query.users({where: {groupRequest_not: null}}, info)
        }
    },
    Mutation: {
        async signUpUser(parent, {data}, { prisma }, info) {
          try {
            if (!isEmail(data.email)) { throw new Error('la dirección de email introducida no es válida...') }
            if (await getUserByEmail(data.email)) throw new Error('la dirección de email introducida ya está en uso...') // return { error: '@signUpUser: email already registered' }
            const password = await hashPassword(data.password)
            if (data.groupRequest && data.groupRequest != 'PUBLIC') {
              await sendEmail('enrique.prez.velasco@gmail.com', 'aaXadmin: User Group Request', `User ${data.name} ${data.lastname} has requested to join ${data.groupRequest} group. Please review this case to confirm the join.`)
            }
            data.group = 'PUBLIC'
            const user = await prisma.mutation.createUser({ data: { ...data, password } }, '{ id }')
            await cacheUsers()
            const token = generateResetToken(user)
            const link = `${process.env.FRONT_END_HOST}confirm-email/${token}`
            const res = await sendConfirmationEmail(data.email, link)
            return { token: user.id }
          }
          catch(error) { throw new Error(error.message) }// return { error: `@signUpUser: ${error.message}`} }
        },
        async confirmEmail(parent, {key}, { prisma }, info) {
            const { id } = jwt.verify(key, process.env.JWT_SECRET)
            if (id.error) return {error: `@confirmEmail: ${id.error}`}
            const res = await prisma.mutation.updateUser({ where: { id }, data: {emailVerified: true} }, '{ id emailVerified}')
            if ( res.id === id && res.emailVerified ) {
              await cacheUsers()
              return { token: id }
            }
            return { error: `@confirmEmail: oops... something went wrong while confirming your email` }
        },
        async sendForgotPasswordEmail(parent, {email}, { prisma }, info) {
            const {id} = getUserByEmail(email)
            if (!id) return {error: 'Mutation: sendForgotPasswordEmail | Error: email not found'}
            try {
              await prisma.mutation.updateUser({ where: { id }, data: { password: '' } }, '{ id }')
              const token = generateResetToken({id: user.id})
              const link = `${process.env.FRONT_END_HOST}change-password/${token}`
              await sendResetPassword(email, link, user.name)
              return { token }
            } catch(err) { return {error: `error @sendForgotPasswordEmail: ${err.message}`} }
            
        },
        async changePassword(parent, {key, newPassword}, { prisma, session }, info) {
            try {
              const id = key ? jwt.verify(key, process.env.JWT_SECRET).id : session.userId
              if (!id) return {error: '@changePassword: Invalid token or user not logged in'}
            } catch(error) {
              return {error: `@changePassword: ${error.message}`}
            }
            if (typeof newPassword === 'string') newPassword = await hashPassword(newPassword)
            try {
              const res = await prisma.mutation.updateUser({ where: { id }, data: { password: newPassword } }, '{ id }')
              await cacheUsers()
              return { token: res.id }
            } catch(error) { return {error: `@changePassword: ${error.message}`} }

        },
        async loginUser(parent, {data}, { session, request, redis }, info) {
            if (!isEmail(data.email)) return { error: '@logInUser: email not valid' }
            const user = await getUserByEmail(data.email)
            if ( !user  ) return {error: `@loginUser: User not found`}
            const match = await bcrypt.compare(data.password, user.password)
            if ( !match ) return {error: `@loginUser: Invalid password`}
            if (!user.emailVerified) {
              const token = generateResetToken({id: user.id})
              const link = `${process.env.FRONT_END_HOST}confirm-email/${token}`
              const res = await sendConfirmationEmail(data.email, link)
              return {error: '@loginUser: eMail not verified'}
            }
            session.userId = user.id
            session.isAdmin = user.isAdmin
            session.group = user.group
            console.log('SESSION: ', session)
            if (request.sessionID) { await redis.lpush(`${userSessionIdPrefix}${user.id}`, request.sessionID) }
            return { token: user.id }
        },
        async loginUserMobile(parent, {data}, { prisma }, info) {
            // if (!isEmail(data.email)) return { error: '@logInUser: email not valid' }
            const user = await getUserByEmail(data.email)
            if ( !user  ) { throw new Error('El email no coincide con ningún usuario') }
            const match = await bcrypt.compare(data.password, user.password)
            if ( !match ) { throw new Error('La contraseña no coincide') }
            if (!user.emailVerified) {
              const token = generateResetToken({id: user.id})
              const link = `${process.env.FRONT_END_HOST}confirm-email/${token}`
              const res = await sendConfirmationEmail(data.email, link)
              throw new Error('No ha verificado su email aún. Le hemos enviado un nuevo email de verificación a su dirección. Si el problema persiste por favor comuníquelo escribiendo a info@alicialonso.org')
            }
            try {
              if (data.deviceToken && data.devicePermission) {
                const notif = await prisma.mutation.updateUser({ 
                where: { id: user.id }, 
                data: { notificationsDevice: data.deviceToken, notificationsPermission: data.devicePermission } },
                '{id}'
                )
                await cacheUsers()
              }
            } catch(err) { throw new Error('Ha ocurrido un error al registrar su dispositivo para notificaciones...')}
            return { token: user.id }
        },
        async deleteUser(parent, args, { prisma, session }, info) {
          const id = session.userId
          try {
            const res = await prisma.mutation.deleteUser({ where: { id } }, info)
            await cacheUsers()
            return res
          } catch(error) { return {error: `@deleteUser: ${error.message}`}}
        },
        async logoutUser(parent, args, {session, response}, info) {
          const id = session.userId
          if (id) {
            await session.destroy(err => {
              if (err) { console.log('ERROR @LOGOUTUSER MUTATION / SESSION DESTROY: ', err) }
            })
            response.clearCookie("qid")
            return { token: id }
          }
          return { error: '@logoutUser: no user authenticated...'}
        },
        async logoutUserMobile(parent, { per }, { prisma }, info) {
          try {
            const res = await prisma.mutation.updateUser({ 
              where: { id: per }, 
              data: { notificationsDevice: '', notificationsPermission: false } }, '{id}'
            )
          } catch(err) { return { error: `Error while loggin off: ${JSON.stringify(err)}`} }
          return { token: res.id }
        },
        async updateUser(parent, args, { prisma, session }, info) {
            const id = session.userId
            try {
            if (id) {
              if (typeof args.data.password === 'string') args.data.password = await hashPassword(args.data.password)
              const res = prisma.mutation.updateUser({ where: { id }, data: args.data }, info)
              await cacheUsers()
              return res
            }} catch(error) { return {error: `@updateUser: ${error.message}`}}
            return {error: `@updateUser: unknown error`}
        },
        async confirmGroupRequest(parent, { id, confirm }, { prisma, session }, info) {
            const adminId = session.userId
            if (!session.userId && !session.isAdmin) { return {error: 'Authentication and admin privileges are required'}}
            const user = await getUserById(id)
            console.log('USER% ', user)
            if (!user) return {error: 'Mutation: confirmGroupRequest | Error: user not found'}
            try {
              const { group, groupRequest } = user
              if (!groupRequest) { return {error:'@confirmGroupRequest: no request found...'}}
              if (confirm && groupRequest) {
                const res = await prisma.mutation.updateUser({where: {id}, data:{group: groupRequest, groupRequest: null}}, '{id email name lastname}' )
                await cacheUsers()
                sendConfirmGroup(res.email, res.name, groupRequest)
                return {token: res.id}
              }
              else {
                const res = await prisma.mutation.updateUser({where: {id}, data:{groupRequest: null}}, '{id, email, name}' )
                await cacheUsers()
                sendRejectGroup(res.email, res.name, groupRequest)
                return {token: res.id}
              }
            } catch(error) { return {error: `@confirmGroupRequest: ${error}`}}
        },
        async setAdmin(parent, {id}, { prisma, session }, info) {
            if (!session.userId || !session.isAdmin) { return {error: 'Authentication and admin privileges required'} }
            if (! await getUserById(id) ) return {error: 'setAdmin: user not found'}
            try {
              const res = await prisma.mutation.updateUser({where: {id}, data:{isAdmin:true}}, '{id}')
              await cacheUsers()
              return {token: res.id}
            } catch(error) { return {error: `@setAdmin: ${error.message}`}}
        },
        async unsetAdmin(parent, {id}, { prisma, session }, info) {
            if (!session.userId || !session.isAdmin) { return {error: 'Authentication and admin privileges required'} }
            if (! await getUserById(id)) return {error: 'setAdmin: user not found'}
            try {
              const res = await prisma.mutation.updateUser({where: {id}, data:{isAdmin:false}}, '{id}')
              await cacheUsers()
              return {token: res.id}
            } catch(error) { return {error: `@unsetAdmin: ${error.message}`}}
        },
        async unsubscribeEmail(parent, {email}, {prisma}, info) {
          await sendEmail("fundacion@alicialonso.org", "Rejected Email", `The recipient of address: ${email} does not want to receive further communications`)
          return {token: email}
        },
        async inviteToBeta(parent, {emails}, ctx, info) {
          emails.forEach(async (email) => {
            await sendBetaWelcome(email)
          })
          return {token: 'Ok'}
        }
    }
}
