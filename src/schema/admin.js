import { sendInstitutionalMessage } from '../utils/emailService';

// ---------------------------------------------------
//      TYPE DEFS
// ---------------------------------------------------

export const typeDef = `
    input institutionalMessageInput {
        name: String!
        charge: String!
        to: String!
        subject: String!
        presentation: String!
        message: String!
        farewell: String!
    }
    extend type Mutation {
        sendInstitutionalMessage(data: institutionalMessageInput! ): AuthPayload!
    }
`

// ---------------------------------------------------
//      RESOLVERS
// ---------------------------------------------------

export const Resolvers = {
    Query: {},
    Mutation: {
        async sendInstitutionalMessage(parent, { data }, { prisma }, info) {
            const res = await sendInstitutionalMessage({...data})
            return { token: JSON.stringify(res) }
        }
    }
}
