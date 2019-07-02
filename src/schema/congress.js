import * as _ from 'lodash';
import isEmail from 'validator/lib/isEmail';
import { cacheUsers } from '../cache';
import { sendConfirmationEmail, sendCongressMessage, sendInstitutionalMessage } from '../utils/emailService';
import { generateResetToken } from '../utils/generateToken';
import hashPassword from '../utils/hashPassword';
import { getUserByEmail, getUserById } from '../utils/queryCache';

// ---------------------------------------------------
//      TYPE DEFS
// ---------------------------------------------------

export const typeDef = `
    enum ParticipationType {
        ATTENDEE
        SPEAKER
    }
    enum ParticipationStatus {
        PREACTIVE
        ACTIVE
        CANCELED
    }
    enum ProposalStatus {
        INREVIEW
        APPROVED
        REJECTED
    }
    type CongressEdition {
        id: ID!
        year: Int!
        participants: [Participant!]! 
        startDate: DateTime
        endDate: DateTime
        # products: [CongressProduct!]!
        committee: [CommitteBoardUser!]!
    }
    type CongressProduct {
        id: ID!
        congress: CongressEdition!
        # product: Product!
    }
    type Participant {
        id: ID!
        user: User!
        type: ParticipationType!
        participationStatus: ParticipationStatus!
        congress: CongressEdition! 
        proposals: [Proposal!]!
        paymentSettled: Boolean!
        authorized: Boolean!
        # invoiceID: Invoice
    }
    type CommitteBoardUser {
        id: ID!
        congress: CongressEdition!
        user: User!
        reviews: [ProposalReview!]!
    }
    type ProposalReview {
        id: ID!
        proposal: Proposal!
        committeUser: CommitteBoardUser!
        status: ProposalStatus!
    }
    type Proposal {
        id: ID!
        speakerApplication: Participant!
        abstract: String!
        status: ProposalStatus!
        reviews: [ProposalReview!]!
    }

    input FetchCongressNode {
        query: String
        id: String
        user: String
    }
    input ProposalInput {
        speakerApplication: ID!
        abstract: String!
    }
    type ParticipantPayload {
        userID: String
        participantID: String
    }
    extend type Query {
        congressEditions: CongressEdition!
        participants( congressID: String!, type: ParticipationType  ): [Participant!]!
        proposals( applicationID: ID, query: String ): [Proposal!]!
        pendingProposalConfirmations: [Proposal!]!
        pendingPayments: [User!]!
        commiteeBoardUsers: [User!]!
        commiteeBoardUserReviews(committeeBoardUserID: String): [ProposalReview!]!
    }

    extend type Mutation {
        registerParticipant(congressID: String!, type: ParticipationType, data: CreateUserInput!): ParticipantPayload!
        joinParticipant(congressID: String!, type: ParticipationType!, userID: String): Participant! 
        cancelParticipant(congressID: String!, userID: String): Participant!
        createSpeakProposal(congressID: String!, abstract: String!, userID: String): Proposal!
        deleteSpeakProposal(proposalID: ID!, userID: String): Proposal!
        updateProposalReview(reviewID: ID!, status: ProposalStatus!, userID: String): AuthPayload!
        settlePayment(applicationID: ID!): Participant!
        notifyParticipant(applicationID: ID!): Participant!
        assignCommitteeMember(congressID: String!, userID: String!): AuthPayload!
    }
`

// ---------------------------------------------------
//      COMMON FUNCTIONS
// ---------------------------------------------------

const getApplicationID = async (userID, congressID, prisma ) => {
    if (!await prisma.exists.CongressEdition({id: congressID})) throw new Error('Congress not found')
    const participant = await prisma.query.participants( { where: 
        { user: { id: userID }, congress: { id: congressID } } }, '{ id }' )
    if (!participant.length) throw new Error('No participation found')
    else if (participant.length > 1) throw new Error('More than one participation found')
    return participant[0].id
}

// ---------------------------------------------------
//      RESOLVERS
// ---------------------------------------------------

export const Resolvers = {
    Query: {
        congressEditions(parent, args, { prisma }, info ) {
            return prisma.query.congressEditions()
        },
        participants(parent, { congressID, type }, { prisma, session: { group, isAdmin, userId } }, info ) {
            if (type) { 
                return prisma.query.participants({ where: { congress: { id: congressID }, type: type } }, info)
            } else {  
                return prisma.query.participants({ where: { congress: { id: congressID } } }, info)
            }
             
        },
        proposals(parent, { applicationID, query = "" }, { prisma, session: { group, isAdmin, userId } }, info ) {
            const pQuery = applicationID ? 
                            {where: { speakerApplication: { applicationID } } } 
                            : 
                            {where: { abstract_contains: query} }
            return prisma.query.proposals(pQuery, info)
        },
        pendingProposalConfirmations(parent, args, { prisma, session: { group, isAdmin, userId} }, info) {
            return prisma.query.proposals({where: { status: 'INREVIEW' } }, info)
        },
        pendingPayments(parent, args, { prisma, session: { group, isAdmin, userId } }, info) {
            return prisma.query.participants({where: { paymentSettled: true } }, info)
        },
        commiteeBoardUsers() {},
        async commiteeBoardUserReviews(parent, {committeeBoardUserID}, { prisma, session: { userId } }, info) {
            if (!committeeBoardUserID && !userId) throw new Error('Please log in')
            return prisma.query.proposalReviews({where: {committeUser: { user: { id: committeeBoardUserID || userId } } } }, info)
        },
    },
    Mutation: {
        async registerParticipant(parent, { congressID, type, data }, { prisma }, info) {
            //--> this mutation is for users without alicialonso account
            try {
                if (!isEmail(data.email)) { throw new Error('la dirección de email introducida no es válida...') }
                if (await getUserByEmail(data.email)) { throw new Error('la dirección de email introducida ya está en uso...') }
                const password = await hashPassword(data.password)
                data.groupRequest = null
                data.group = 'PUBLIC'
                const user = await prisma.mutation.createUser({ data: { ...data, password } }, '{ id }')
                await cacheUsers()
                const link = `${process.env.FRONT_END_HOST}confirm-email/${generateResetToken(user)}` 
                const res = await sendConfirmationEmail(data.email, link) 
                const fData = {
                    type,
                    congress: { connect: { id: congressID} },
                    user: { connect: { id: user.id} }
                }
                const participant = await prisma.mutation.createParticipant({data: fData}, '{ id }')
                return { userID: user.id, participantID: participant.id }
              }
              catch(error) { throw new Error(error.message) }
        },
        async joinParticipant(parent, { congressID, type, userID }, { prisma, session: { userId } }, info ) {
            //--> this mutation is for users with an alicialonso account
             if (!userID && !userId) throw new Error('Please log in')
            // participant must accept agreement and terms
            const data = {
                type,
                congress: { connect: { id: congressID } },
                user: { connect: { id: userId || userID } }
            }
            return prisma.mutation.createParticipant({data}, info)
        },
        async cancelParticipant(parent, { congressID }, { prisma, session: { userId } }, info ) {
            if (!userId) throw new Error('Please log in')
            try {
                return prisma.mutation.updateParticipant( {  
                                                where: { id: await getApplicationID(userId, congressID, prisma) }, 
                                                data: { participationStatus: 'CANCELED' } 
                                            }, info )
            } catch (error) { throw new Error(error.message) }
        },
        async createSpeakProposal(parent, { congressID, abstract, userID }, { prisma, session: { userId } }, info ) {
            if (!userID && !userId) throw new Error('Please log in')
            try {
                // get all committe members ids and map to create proposal reviews for each
                const committeeMembers = await prisma.query.committeBoardUsers({
                    where: { congress: { id: congressID } }
                }, '{ id  user { email } }')
                const committeMemberIDs = committeeMembers.map( ({id}) => ({ committeUser: { connect: { id } } }) )
                // create proposal and reviews
                const applicationID = await getApplicationID(userId || userID, congressID, prisma)
                const res = await prisma.mutation.createProposal( { data: {
                    speakerApplication: { connect: { id: applicationID } },
                    abstract,
                    reviews: { create: committeMemberIDs }
                }}, info)
                committeeMembers.forEach( async ({user: { email }}) => {
                    // if successful: notify all board members via email #########################################
                    await sendCongressMessage({
                        to: email, 
                        subject: "New Speaker Proposal Submitted",
                    message: `The user $??? has submitted a new proposal titled: $???`})
                })
                return res
            } catch (error) { throw new Error(error.message) }            
        },
        async deleteSpeakProposal(parent, { proposalID, userID }, { prisma, session: { userId } }, info ) {
            if (!userID && !userId) throw new Error('Please log in')
            try {
                const proposal = await prisma.query.proposals({
                    where: 
                        { 
                            id: proposalID, 
                            speakerApplication: { user: { id: userID || userId } } 
                        }
                    }, '{ id speakerApplication { congress { id } } }'
                )
                if ( proposal.length > 0 ) {
                    const res = await prisma.mutation.deleteProposal( {where: { id: proposalID } }, info)
                    const committeeMembers = await prisma.query.committeBoardUsers({
                        where: { congress: { id: proposal[0].speakerApplication.congress.id } }
                    }, '{ user { email } }')
                    committeeMembers.forEach( async ({user: { email }}) => {
                        // if successful: notify board admins via email #########################################
                        await sendCongressMessage({
                            to: email, 
                            subject: "Proposal Deletted",
                        message: `The user $??? has deletted the proposal titled: $???`})
                    })
                    return res
                } else { throw new Error('Proposal not found') }
            } catch (error) { throw new Error(error.message) }
            
        },
        async updateProposalReview(parent, { reviewID, status }, { prisma, session: { userId } }, info ) {
            try {
                // check if the proposal has already been approved or rejected
                const { proposal } = await prisma.query.proposalReview({
                    where: { id: reviewID } 
                }, '{ proposal { id status speakerApplication { user { email } }  } }')
                if (proposal.status != "INREVIEW") throw new Error('Proposal not modifiable: consensus already achieved')
                // proceed to update the proposal's review
                await prisma.mutation.updateProposalReview({ where: { id: reviewID }, data: { status } }, '{ id }')
                // check for concensus on all other reviews
                const { reviews } = await prisma.query.proposal({where: { id: proposal.id} }, '{ reviews { status } }')
                if ( _.uniqWith(reviews, _.isEqual).length = 1 ) {
                    await prisma.mutation.updateProposal({ where: { id: proposal.id }, data: { status: reviews[0].status } }, '{ id }')
                    // notify new status to applicant of porposal including the processes to follow after #########################################
                    await sendCongressMessage({
                        to: proposal.speakerApplication.user.email, 
                        subject: "New Speaker Proposal Submitted",
                    message: `The user $??? has submitted a new proposal titled: $???`})
                    // notify committee board that consensus finally was achieved for proposal #########################################
                    await sendCongressMessage({
                        to: email, 
                        subject: "Consensus $???? for proposal titled $???",
                        message: `The committee has reached consensus to $???? the proposal with title $????`})
                }
                return { token: reviewID }
            } catch (error) { throw new Error(error.message) } 
        },
        // settlePayment(parent, { applicationID }, { prisma, session: { userId, isAdmin } }, info ) {},
        async notifyParticipant(parent, { applicationID }, { prisma, session: { userId, isAdmin } }, info ) {
            // send custom email message to participant with congress template
        },
        async assignCommitteeMember(parent, { congressID, userID }, {prisma, session }, info) {
            // if (!session.isAdmin) { throw new Error('You need administrator privileges to perform this action') }
            const user = getUserById(userID)
            if ( !user) { throw new Error('User to assign as committee member does not exists') }
            const congress = prisma.exists.CongressEdition( { id: congressID } )
            if ( !congress ) { throw new Error('The congress edition to be assigned doeas not exists')}
            try {
                const committeeMember = await prisma.mutation.createCommitteBoardUser({ data: {
                    user: { connect: { id: userID } },
                    congress: { connect: { id: congressID } }
                }}, '{ id }' )
                // notify user
                await sendInstitutionalMessage({
                    to: user.email, 
                    subject: 'Bienvenido al Comité de Evaluación del I Congreso de Investigación y Artes Escénicas',
                    message: '',
                    farewell: '',
                    name: '',
                    charge: ''
                })
                // check for current proposals and create reviews
                const reviewableProposals = await prisma.query.proposals( { where: { status: 'INREVIEW' } }, '{ id }')
                reviewableProposals.forEach( async ({ id }) => {
                    await prisma.mutation.createProposalReview({data: {
                        committeUser: { connect: { id: committeeMember.id } },
                        proposal: { connect: { id } }
                    }})
                })

                return { token: committeeMember.id, error: '' }
            } catch(error) { throw new Error(error) }
        }
    }

}
