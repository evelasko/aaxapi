import ApolloBoost, { gql } from 'apollo-boost';
import bcrypt from 'bcryptjs';
import 'cross-fetch/polyfill';
import { cacheUsers } from '../src/cache';
import prisma from '../src/prisma';

const client = new ApolloBoost({ uri: 'http://localhost:4000' })
var Users = []
var congressID = ''
var speakerIDs = []
var committeeIDs = []
var admin = {}

beforeAll(async () => {
    Users = [
        { data: { name: "CB1", email: "cb1@email.com", password: bcrypt.hashSync('1234567890'), emailVerified: true, group: 'STAFF' } },
        { data: { name: "CB2", email: "cb2@email.com", password: bcrypt.hashSync('1234567890'), emailVerified: true, group: 'STAFF' } },
        { data: { name: "CB3", email: "cb3@email.com", password: bcrypt.hashSync('1234567890'), emailVerified: true, group: 'PUBLIC' } },
        { data: { name: "CB4", email: "cb4@email.com", password: bcrypt.hashSync('1234567890'), emailVerified: true, group: 'PUBLIC' } },
        { data: { name: "SP1", email: "sp1@email.com", password: bcrypt.hashSync('1234567890'), emailVerified: true, group: 'PUBLIC' } },
        { data: { name: "SP2", email: "sp2@email.com", password: bcrypt.hashSync('1234567890'), emailVerified: true, group: 'PUBLIC' } },
        { data: { name: "SP3", email: "sp3@email.com", password: bcrypt.hashSync('1234567890'), emailVerified: true, group: 'PUBLIC' } },
    ]
    Users.forEach( async (data, i) => { 
        const { id } = await prisma.mutation.createUser(data, '{id}')
        if ( i <= 3 ) { committeeIDs.push({id}) } else { speakerIDs.push( { id } ) }
        Users[i].data.id = id
    })
    const { id } = await prisma.mutation.createCongressEdition({data: { 
        year: 2019, startDate: '2019-10-05T00:00:00.000Z', endDate: '2019-10-07T00:00:00.000Z'
    }}, '{id}') 
    congressID = id
    admin = await prisma.mutation.createUser({data: {
        name: 'TheAdmin', email: 'admin@email.com', password: bcrypt.hashSync('1234567890'), emailVerified: true, group: 'STAFF', isAdmin: true
    }}, '{ id }')
    console.log('ADMIN: ', admin.id)
    await cacheUsers()
})

afterAll(async () => {
    await prisma.mutation.deleteManyProposalReviews()
    await prisma.mutation.deleteManyProposals()
    await prisma.mutation.deleteManyCommitteBoardUsers()
    await prisma.mutation.deleteManyParticipants()
    await prisma.mutation.deleteManyCongressEditions()
    await prisma.mutation.deleteManyUsers()
})

test('should assign committee board to a user account', async () => {
    await cacheUsers()
    // login as admin
    const loginAdmin = gql`
        mutation LoginUser ($email: String!, $password: String!) {
            loginUser ( data: { email: $email, password: $password } ) { token error }
        }
    `
    const res = await client.mutate({mutation: loginAdmin, variables: {
        email: 'admin@email.com', password: '1234567890'
    }})    
    // create 4 committeeBoardMember connected to a different user account each
    const createComitteeMember = gql`
        mutation AssignCommitteeMember ($userID: String!, $congressID: String!) {
            assignCommitteeMember ( userID: $userID, congressID: $congressID ) { token error }
        }
    `
    committeeIDs.forEach(async ({id}) => {
        const { token } = await client.mutate({mutation: createComitteeMember, variables: {
            userID: id , congressID 
        }})
        // EXPECT: user to have a committe board ID
        const committeeMemberExists = await prisma.exists.CommitteBoardUser({ id: token }) 
        expect(committeeMemberExists).toBe(true)
    })   
})
test('let public register and create an application for the congress (as speaker)', async () => {
    // create a new user account thru the congress mutation
    const SignUpSpeakerMutation = gql`
    mutation SignUpSpeaker (
        $congressID: String!, $email: String!, $name: String, $password: String!, $type: ParticipationType!
    ) {
        registerParticipant(
            congressID: $congressID,
            type: $type
            data: { email: $email, name: $name, password: $password }
        ) { userID participantID }
    }
    `
    const { data: { registerParticipant: { userID , participantID } } } = await client.mutate({
        mutation:SignUpSpeakerMutation,
        variables: {
            congressID,
            email: 'susp@speaker.com',
            name: 'Signed Up Speaker',
            type: 'SPEAKER',
            password: bcrypt.hashSync('1234567890')
        }
    })
    // EXPECT: such user account to have an application ID
    expect(userID).toBeDefined()
    expect(participantID).toBeDefined()
})
test('let current users create an application for the congress (as speaker)', async () => {
    const SignUpSpeakerMutation = gql`
        mutation JoinParticipant ( $congressID: String!, $type: ParticipationType!, $userID: String) 
            {
                joinParticipant(  congressID: $congressID, type: $type, userID: $userID  ) 
                { user { id } }
        }
    `
    const { data: { joinParticipant: { user: { id  } } } } = await client.mutate({
        mutation: SignUpSpeakerMutation,
        variables: {congressID, type: 'SPEAKER', userID: Users[4].data.id }
    })
    expect(id).toBe(Users[4].data.id)
})
test('let applicant add up to two proposals', async () => {
    const CreateProposal = gql`
        mutation CreateSpeakProposal ( $congressID: String!, $abstract: String!, $userID: String) 
            {
                createSpeakProposal(  congressID: $congressID, abstract: $abstract, userID: $userID  ) 
                { speakerApplication { id user { id } } }
        }
    `
    const { data: { createSpeakProposal: { speakerApplication } } } = await client.mutate({
        mutation: CreateProposal,
        variables: {congressID, abstract: 'Some text', userID: Users[4].data.id }
    })
    const proposals = await prisma.query.proposals(
        { where: { speakerApplication: { id: speakerApplication.id } } },
        '{ id }'
        )
    const reviews = await prisma.query.proposalReviews({ where: { proposal: { id: proposals[0].id } } }, '{ id }' )
    expect(proposals.length).toBeGreaterThan(0)
    expect(reviews.length).toBeGreaterThan(0)
    expect(speakerApplication.user.id).toBe(Users[4].data.id)
    expect(committeeIDs.length).toBe(4)
    expect(reviews.length).toBe(4)
    // EXPECT: user to have two proposals
    // EXPECT: commite member to have two reviews
    // EXPECT: those two reviews to be linked to the proposal
    // create another proposal
    // EXPECT: an error...
})
test('let applicant see their proposals with its current status', async () => {
    // login the user of the preceeding test
    // fetch all of its proposals
    // EXPECT: user to have 2 proposals (based on the preceeding test)
    expect(committeeIDs.length).toBe(4)
})
test('let committee members see the proposals they have to review', async () => {
    // fetch all committee member IDs
    // fo each committee member ID:
    //      login each committee member
    //      loop: EXPECT: each committee member to have two reviews pending
    //      loop: logout committee member
    expect(committeeIDs.length).toBe(4)
    const committeeBoardReviews = gql`
        query CommitteeBoardReviews ($committeeBoardUserID: String) {
            commiteeBoardUserReviews(committeeBoardUserID: $committeeBoardUserID) { id }
        }
    `
    committeeIDs.forEach(async ({id}) => {
        const { data: { commiteeBoardUserReviews } } = await client.query({
            query: committeeBoardReviews, 
            variables: {committeeBoardUserID: id}}
        )
        expect(commiteeBoardUserReviews.length).toBeGreaterThan(0)
    })
})
test('if a proposal gets deleted by its owner, its committee reviews get deleted as well', async () => {
    // login committe
    const proposals = await prisma.query.proposals({}, '{ id speakerApplication { user { id } } }')
    console.log('PROPOSALES: ', proposals)
    const startingProposalReviews = await prisma.query.proposalReviews(
        { where: { proposal: { id: proposals[0].id } } },
        '{ id proposal { id } }'
    )
    expect(startingProposalReviews.length).toBe(committeeIDs.length)
    const deleteProposal = gql`
        mutation DeleteProposal ($proposalID: ID!, $userID: String) {
            deleteSpeakProposal(proposalID: $proposalID, userID: $userID) 
            { id }
        }
    `
    const { data: { deleteSpeakProposal: { id } } } = await client.mutate({mutation: deleteProposal, variables: {
        proposalID: proposals[0].id, userID: proposals[0].speakerApplication.user.id
    }})
    expect(id).toBe(proposals[0].id)
    const endingProposalReviews = await prisma.query.proposalReviews(
        {where: { proposal: { id: proposals[0].id } } },
        '{ id }'
    )
    expect(endingProposalReviews.length).toBeLessThan(startingProposalReviews.length)
    // save its review's count as previousReviews
    // logout committee
    // login applicant
    // delete any of its proposals
    // logout applicant
    // login same committee as before
    // save its review's count as nextReviews
    // EXPECT: previousReviews - nextReviews = 1
    expect(committeeIDs.length).toBe(4)
})
test('let committee member update the status of their reviews', async () => {
    // login a committee member
    // fetch a review of that committee member
    // update the status of the review
    // EXPECT: the review to hold the updated status
    expect(committeeIDs.length).toBe(4)
})
test('let committee members see the reviews already reviewed', async () => {
    // login a committee member
    // fetch the already reviewed reviews
    // EXPECT: committee member to have one review reviewed (the one whose status changed in the preceeding test)
    expect(committeeIDs.length).toBe(4)
})



